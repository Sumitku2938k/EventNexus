# EventNexus Phase 2: Cloudinary Integration Report

**Execution Date:** October 13, 2026  
**Status:** Completed Successfully (Awaiting User Review & Cloudinary Credentials)  
**Target Repository:** `c:\Users\Sumit\Desktop\College Sem Projects\EventNexus Sem 3\College Event Manager`  
**Current Branch:** `main`  

---

## 1. Overview of Phase 2

Phase 2 replaced local persistent-disk file uploads with a serverless-compatible, Cloudinary-backed architecture. Image uploads no longer write to the ephemeral local filesystem (`public/uploads`), preventing upload failures and broken links on Vercel. Existing template variables and UI styling were preserved 100% without breaking changes.

---

## 2. Files Changed and Created

| File | Status | Description of Change |
| :--- | :--- | :--- |
| `package.json` | **Modified** | Added official `cloudinary` Node.js SDK (`^2.11.0`). |
| `package-lock.json` | **Modified** | Updated lockfile for Cloudinary SDK and dependencies. |
| `utils/cloudinary.js` | **Created** | Created Cloudinary configuration, magic-byte image buffer validation, upload stream handler, and safe asset deletion functions. |
| `middleware/upload.js` | **Modified** | Replaced `multer.diskStorage` with `multer.memoryStorage()`; enforced 5MB size limit and image extension filtering. Local disk directories are no longer created or accessed. |
| `models/events.js` | **Modified** | Added `posterPublicId` (String, default `null`) to track Cloudinary asset IDs while keeping `poster` as the public HTTPS delivery URL. |
| `schema.js` | **Modified** | Updated Joi event validation to allow `posterPublicId` and flexible poster URI/string inputs. |
| `routes/events.js` | **Modified** | Integrated Cloudinary upload stream, magic-byte file validation, orphan asset cleanup on database failure, replacement of old assets on update, and Cloudinary asset deletion on event deletion. |
| `app.js` | **Modified** | Enhanced global error middleware to catch `MulterError` (`LIMIT_FILE_SIZE`) and render a user-friendly 400 error page instead of a 500 crash. |

---

## 3. Architecture & Cloudinary Upload Flow

### Architecture Diagram
```
Client Multipart Form (New / Edit Event)
  │
  ├──► Multer Middleware (memoryStorage, 5MB limit, extension filter)
  │      └── Stores image in req.file.buffer (in RAM, zero disk writes)
  │
  ├──► Joi Event Validation (validateEvent)
  │
  ├──► Magic-Byte Image Validation (isValidImageBuffer)
  │      └── Inspects file header bytes (JPEG, PNG, GIF, WEBP)
  │
  ├──► Cloudinary Stream Upload (uploadToCloudinary via stream)
  │      └── Saves to folder: 'eventnexus/posters'
  │      └── Returns secure_url and public_id
  │
  ├──► Database Save (Mongoose Event Model)
  │      ├── poster = secure_url (HTTPS)
  │      └── posterPublicId = public_id
  │
  └──► Safe Asset Cleanup
         ├── If DB save fails: Deletes newly uploaded Cloudinary asset immediately.
         ├── On Edit replacement: Deletes old Cloudinary asset only AFTER new DB save succeeds.
         └── On Event Delete: Deletes Cloudinary asset only if posterPublicId is known.
```

---

## 4. Cloudinary Setup Instructions

To activate live image uploads to your Cloudinary account, add the following variables to your local `.env` and Vercel Project Settings:

```ini
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

### Where to Find Your Cloudinary Credentials:
1. Log in to your Cloudinary Management Console ([cloudinary.com](https://cloudinary.com/)).
2. Navigate to your Dashboard.
3. Locate the **Product Environment Credentials** section containing:
   - Cloud Name
   - API Key
   - API Secret
4. Copy these into `.env` (locally) and Vercel Project Settings (for production).

---

## 5. Legacy Data & Backward Compatibility Handling

1. **Default Fallback Posters:**
   - If no image is uploaded during event creation, `models/events.js` assigns the default festive banner URL (`https://d12m9erqbesehq.cloudfront.net/...`) and sets `posterPublicId = null`.
2. **Seeded Base64 Data URIs:**
   - Pre-existing seeded sample events in `init/data.js` contain `data:image/jpeg;base64,...` strings. These remain completely valid strings in `poster` and continue to display correctly in all EJS templates.
3. **Legacy Local Paths (`/uploads/...`):**
   - Any historical events referencing `/uploads/...` have `posterPublicId = null`.
4. **Safe Deletion Guard:**
   - When an event is deleted via `DELETE /events/:id`, `routes/events.js` explicitly checks `if (event.posterPublicId)`. If `posterPublicId` is null (as is the case for all legacy, default, and Base64 posters), `deleteFromCloudinary` is completely skipped, ensuring external URLs and non-Cloudinary assets are never disturbed.

---

## 6. Verification Tests and Actual Results

| Test ID | Test Scenario | Execution Command / Procedure | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P2-T01** | JavaScript Syntax Verification | `node -c` on all 18 repository JS source files | All files compile cleanly with exit code 0 | **All 18 source files returned OK** | **PASSED** |
| **P2-T02** | Cloudinary Configuration Detection | Invoked `isCloudinaryConfigured()` without credentials | Returns `false` | Returned `false` | **PASSED** |
| **P2-T03** | Missing Cloudinary Credentials Guard | Executed `uploadToCloudinary()` without env variables | Throws clean, descriptive error message | Threw: `Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY...` | **PASSED** |
| **P2-T04** | Magic-Byte Image Header Detection | Tested valid JPEG, PNG, GIF, WEBP buffers and fake text payload | Returns `true` for all valid image headers, `false` for text | JPEG: `true`, PNG: `true`, GIF: `true`, WEBP: `true`, Fake: `false` | **PASSED** |
| **P2-T05** | Multer File Extension & MIME Filter | Passed `malicious.exe` and `document.pdf` to Multer `fileFilter` | Rejects non-image files with clear error | Rejected: `Only image files are allowed (jpeg, jpg, png, gif, webp)` | **PASSED** |
| **P2-T06** | Multer Valid Image Acceptance | Passed `photo.jpg` (`image/jpeg`) to Multer `fileFilter` | Accepts file without error | Accepted: `true` | **PASSED** |
| **P2-T07** | Model Default Without Poster | Created `Event` document without `poster` field | Schema sets default URL and `posterPublicId = null` | `Default poster set: true`, `Default posterPublicId is null: true` | **PASSED** |
| **P2-T08** | Model Persistence With Cloudinary Fields | Created `Event` document with HTTPS URL and public ID | Both fields stored and persisted accurately | `Cloudinary poster saved: true`, `posterPublicId saved: true` | **PASSED** |
| **P2-T09** | Safe Asset Deletion Null Guard | Passed `null`, `undefined`, and `""` to `deleteFromCloudinary()` | Skips deletion safely and returns `null` | `Null safe: true`, `Undefined safe: true`, `Empty safe: true` | **PASSED** |
| **P2-T10** | Live Cloudinary Asset Upload & Delivery | Upload test poster to live Cloudinary account | Asset uploaded and accessible via HTTPS | **NOT TESTED** (Live Cloudinary credentials not yet provided in `.env`) | **PENDING USER CREDENTIALS** |

---

## 7. Known Limitations & Recommendations

1. **Pending Cloudinary Credentials:**
   - Real network uploads to Cloudinary require adding `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to `.env`. Once added, image uploads will immediately stream to your Cloudinary dashboard.
2. **Legacy Base64 Seed Document Sizes:**
   - The sample events in `init/data.js` still store large Base64 strings. In a future data cleanup phase, these can be replaced with direct Cloudinary or Unsplash URLs to keep MongoDB Atlas documents lean.
3. **Session & Security Incomplete:**
   - Phase 3 will address the remaining session persistence (`connect-mongo`), privilege escalation flaw in `signup.ejs`, and cookie security flags.
