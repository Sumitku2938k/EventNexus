# EventNexus Phase 5 Hotfix Report: Fix `"_csrf" is not allowed`

**Date:** 2026-10-13  
**Status:** Resolved & Verified  
**Scope:** Fix `"_csrf" is not allowed` Joi validation error during event creation and editing while preserving full CSRF protection, Joi schema enforcement, Cloudinary image uploads, and EJS UI templates.

---

## 1. Confirmed Root Cause Analysis

### The Failure Chain
1. **Form Submission:** In `views/events/new.ejs` (Line 11) and `views/events/edit.ejs` (Line 11), both forms include a hidden CSRF token input:
   ```html
   <input type="hidden" name="_csrf" value="<%= csrfToken %>">
   ```
   Both forms also specify `enctype="multipart/form-data"` and provide query-token fallbacks (`action="/events?_csrf=..."` and `action="/events/:id?_method=PUT&_csrf=..."`).
2. **Global CSRF Middleware:** In `app.js` (Line 79), `csrfProtection` runs globally before route handlers. Because Express's `express.urlencoded` does not parse multipart streams, `req.body` is empty at that stage. `csrfProtection` validates the token via `(req.query && req.query._csrf)` against `req.session.csrfToken` and calls `next()`.
3. **Multer Parsing:** In `routes/events.js`, the route middleware chain invokes `upload.single('poster')` (Multer). Multer parses the multipart boundary and populates `req.body` with all submitted form text fields. Because `<input type="hidden" name="_csrf">` was submitted in the form, `req.body` now contains `_csrf: "<token>"` alongside `req.body.event`.
4. **Joi Event Validation:** Immediately following Multer in `routes/events.js`, `validateEvent` executed:
   ```javascript
   // routes/events.js (Original line 23)
   const { error } = eventSchema.validate(req.body);
   ```
5. **Schema Conflict:** In `schema.js`, `eventSchema` was defined strictly as:
   ```javascript
   // schema.js
   const eventSchema = Joi.object({
       event: Joi.object({ ... })
   });
   ```
   Joi default behavior disallows any keys not defined in the schema (`unknown: false`). Because `req.body` contained the top-level `_csrf` key from Multer's parsing, Joi immediately rejected the entire payload with:
   ```
   "_csrf" is not allowed
   ```
   This prevented both event creation (`POST /events`) and event updates (`PUT /events/:id`), with or without posters.

---

## 2. Files Changed and Rationale

| File | Change | Rationale |
| :--- | :--- | :--- |
| [routes/events.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/events.js) | Updated `validateEvent` middleware (Lines 21–38) | Strips `_csrf` and `_method` from a shallow copy of `req.body` before invoking `eventSchema.validate()`. Does not mutate `req.body`. Re-validates `req.body._csrf` against `req.session.csrfToken` if present to provide double CSRF verification. |
| [schema.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/schema.js) | Added `.required()` to top-level `event` object (Line 13) | Ensures the `event` business data object cannot be omitted when non-business metadata is stripped. Does NOT treat `_csrf` as an event business field or allow unknown arbitrary fields. |

---

## 3. Minimal Code-Level Fix

### A. `routes/events.js`
```diff
--- a/routes/events.js
+++ b/routes/events.js
@@ -20,7 +20,17 @@ const validateEventId = (req, res, next) => {
 
 // Validation Middleware
 const validateEvent = (req, res, next) => {
-    const { error } = eventSchema.validate(req.body);
+    // If CSRF token is provided in the body, verify it matches the session token
+    if (req.body && req.body._csrf && req.session && req.body._csrf !== req.session.csrfToken) {
+        return next(new ExpressError(403, 'CSRF validation failed: Invalid token. Please reload the page.'));
+    }
+
+    // Create a copied validation payload and remove CSRF / method metadata before Joi validation
+    const payload = req.body ? { ...req.body } : {};
+    delete payload._csrf;
+    delete payload._method;
+
+    const { error } = eventSchema.validate(payload);
     if (error) {
         throw new ExpressError(400, error.details[0].message);
     }
```

### B. `schema.js`
```diff
--- a/schema.js
+++ b/schema.js
@@ -10,7 +10,7 @@ const eventSchema = Joi.object({
         category: Joi.string().valid("Technical", "Cultural", "Sports").required(),
         poster: Joi.string().optional().allow('', null),
         posterPublicId: Joi.string().optional().allow('', null),
-    }),
+    }).required(),
 });
 
 module.exports = eventSchema;
```

---

## 4. Test Verification & Results

A targeted test suite was created and executed against the live application using an authenticated administrator session, valid CSRF tokens, and real-time Cloudinary image processing:

### A. All 4 Workflows Verified

| Test ID | Scenario | Preconditions | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **HF-W1** | Create event **without poster** | Admin session, hidden `_csrf` in body + query token | HTTP 302 redirect to `/events`, fallback poster saved | HTTP 302, Event created with default CloudFront poster | **PASS** |
| **HF-W2** | Create event **with poster** | Admin session, hidden `_csrf` in body, PNG file | HTTP 302 redirect, asset uploaded to Cloudinary, `secure_url` and `posterPublicId` saved in MongoDB | HTTP 302, Cloudinary asset created in `eventnexus/posters/` | **PASS** |
| **HF-W3** | Edit event **without replacing poster** | Existing event with Cloudinary poster | HTTP 302 redirect, details updated, existing `poster` and `posterPublicId` preserved | HTTP 302, Venue updated, original `posterPublicId` preserved | **PASS** |
| **HF-W4** | Edit event **with replacement poster** | Existing event with Cloudinary poster, new PNG file | HTTP 302 redirect, new asset uploaded, new `posterPublicId` saved, old Cloudinary asset destroyed | HTTP 302, New publicId saved, old publicId destroyed | **PASS** |

### B. Security & Negative Failure Scenarios Verified

| Test ID | Scenario | Steps Executed | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **HF-SEC-1** | Missing CSRF Token | `POST /events` with zero CSRF token | HTTP 403 Forbidden | HTTP 403, "CSRF validation failed" | **PASS** |
| **HF-SEC-2** | Invalid Query CSRF Token | `POST /events?_csrf=invalid` | HTTP 403 Forbidden | HTTP 403, "CSRF validation failed" | **PASS** |
| **HF-SEC-3** | Tampered Body CSRF Token | `_csrf: "forged"` in multipart body | HTTP 403 Forbidden | HTTP 403, "CSRF validation failed" | **PASS** |
| **HF-SEC-4** | Joi Schema Validation | Submit negative fee (`registrationFee: -50`) | HTTP 400 Bad Request | HTTP 400, "registrationFee must be >= 0" | **PASS** |
| **HF-SEC-5** | Unknown Top-Level Field Rejection | Submit unexpected field (`maliciousTopLevel: "hack"`) | HTTP 400 Bad Request | HTTP 400, `"maliciousTopLevel" is not allowed` | **PASS** |
| **HF-SEC-6** | Unsupported File Rejection | Upload executable file (`trojan.exe`) | HTTP 400 Bad Request | HTTP 400, "Only image files are allowed" | **PASS** |
| **HF-SEC-7** | Oversized File Rejection | Upload 5.5MB image | HTTP 400 Bad Request | HTTP 400, "Uploaded file is too large" | **PASS** |
| **HF-SEC-8** | Poster Rollback Safety | PUT with invalid category + new image | HTTP 400, DB update rejected, existing poster public ID retained | HTTP 400, Original poster untouched | **PASS** |

### C. Regression Verification
The full 34-test Phase 5 regression suite (`scratch/regression-suite.js`) was re-run in its entirety:
- **Total Tests:** 34
- **Passed:** 34
- **Failed:** 0
- **Blocked:** 0

---

## 5. Blocked Tests
- **None.** All live Cloudinary tests and MongoDB Atlas queries executed successfully and cleaned up automatically.

---

## 6. Architectural and UI Non-Interference Confirmation
- **No EJS Views Modified:** `views/events/new.ejs` and `views/events/edit.ejs` were preserved without modification.
- **No Global Lax Validation:** Joi `.unknown(true)` was **not** applied. Unknown arbitrary fields remain strictly rejected.
- **Database Preserved:** 4 original users and 22 original events remain untouched in MongoDB Atlas.
- **No Production Deployment:** Changes remain strictly local and tested.
