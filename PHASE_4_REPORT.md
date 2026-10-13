# EventNexus Phase 4: Vercel Deployment Compatibility Report

**Execution Date:** October 13, 2026  
**Status:** Completed and Verified  
**Scope:** Vercel serverless adaptation, Express entry point separation, EJS template bundle inclusion, static asset routing, verified application defect fixes, runtime compatibility verification, and local simulation via `vercel dev`.

---

## 1. Selected Vercel Architecture & Technical Rationale

### A. Evaluated Architectures

| Architecture Option | Description | Pros | Cons / Verdict |
| :--- | :--- | :--- | :--- |
| **Option 1: Pure Zero-Configuration (Root Entry)** | Rely solely on root `app.js` export without `vercel.json`. | Zero configuration files. | **Incompatible with EJS.** Vercel's Node File Trace (NFT) does not trace dynamic filesystem reads (`path.join(__dirname, 'views')`). View lookup fails in production. |
| **Option 2: Dedicated Serverless Entry Point (`api/index.js`) + Modern `vercel.json`** *(Selected)* | Create `api/index.js` exporting the Express instance, paired with `vercel.json` configuring rewrites and function `includeFiles: "views/**"`. | Guaranteed EJS template bundling; clean separation between local server and serverless function; edge static routing. | **Approved.** Official recommended pattern for legacy Express + dynamic template applications on Vercel. |

### B. Official Vercel Documentation Citations

1. **Serverless Functions with Express:**  
   [Using Express.js with Vercel](https://vercel.com/guides/using-express-with-vercel) — Vercel packages Express applications into Vercel Functions. The application instance must be exported (`module.exports = app`) rather than invoking a long-running listening port.
2. **Static Asset Edge Routing:**  
   [Vercel Static File Serving](https://vercel.com/docs/concepts/deployments/troubleshoot-a-build#static-files) — Vercel serves files in the `public/` folder directly from the global CDN edge before rewrite rules are evaluated. `express.static()` is ignored on Vercel, but preserved for local development.
3. **Template Bundling with `includeFiles`:**  
   [Vercel Function Configuration: includeFiles](https://vercel.com/docs/projects/project-configuration#functions) — Files dynamically read at runtime (such as EJS templates inside `views/`) must be explicitly declared in `vercel.json` using the `includeFiles` property.

---

## 2. Configuration & Entry Point Implementations

### A. Dedicated Serverless Entry Point (`api/index.js`)
```javascript
// api/index.js
// Vercel Serverless Entry Point
// Imports the configured Express application without starting a listening server.
const app = require('../app');

module.exports = app;
```

### B. Preserved Local Entry Point (`app.js`)
`app.js` guards `app.listen()` behind a direct-execution check and exports the Express app instance:
```javascript
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;
```
This guarantees that local development (`npm run dev` or `node app.js`) starts the server as normal, while Vercel and automated test runners can import the app without port collisions or competing listeners.

### C. Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ],
  "functions": {
    "api/index.js": {
      "includeFiles": "views/**"
    }
  }
}
```

### D. Static Asset and Template Routing
- **Templates:** Included recursively via `"includeFiles": "views/**"`, ensuring layouts (`views/layouts/boilerplate.ejs`) and partials across all subdirectories (`auth/`, `events/`, `dashboard/`) are bundled into the lambda artifact.
- **Static Assets:** Located in root `public/` (`public/css/style.css`, `public/js/script.js`), served automatically via Vercel's Edge CDN.

---

## 3. Verified Application Bug Fixes

| Defect ID | Description | Root Cause | Solution Implemented |
| :--- | :--- | :--- | :--- |
| **UI-001** | Registration success feedback not displaying | `routes/events.js` did not pass `success` or `error` query variables to `res.render()`. | Updated `GET /events/:id` in [routes/events.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/events.js) to pass `req.query.success` and `req.query.error`. Added dismissible Bootstrap alert banners in [views/events/show.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/show.ejs) with `window.history.replaceState` query cleanup. |
| **UI-002** | Null pointer crash on deleted students in admin view | Direct dereference of `reg.studentId.name` in [views/dashboard/registrations.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/dashboard/registrations.ejs). | Added null guards: `<%= (reg.studentId && reg.studentId.name) ? reg.studentId.name : 'Unknown / Deleted User' %>` and fallback for email. |
| **UI-003** | Runtime crash on invalid or null event date in edit form | `event.date.toISOString()` called without null/validity check in [views/events/edit.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/edit.ejs). | Added Date parsing guard `<% const d = new Date(event.date); if (!isNaN(d.getTime())) { ... } %>`. Added fallback handling across [views/events/show.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/show.ejs), [views/events/index.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/index.ejs), and [views/dashboard/student.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/dashboard/student.ejs). |
| **ERR-001** | Unhandled Mongoose `CastError` on invalid ObjectIds | Route queries (`findById(req.params.id)`) threw unhandled 500 internal server errors on malformed hex strings. | Added `validateEventId` middleware validating `mongoose.Types.ObjectId.isValid` across [routes/events.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/events.js), [routes/registration.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/registration.js), and [routes/dashboard.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/dashboard.js). Mapped global `CastError` to 404 in [app.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/app.js). |
| **SEC-009** | Missing `csrfToken` reference in `boilerplate.ejs` | When views rendered without `csrfToken` in locals, EJS threw a fatal ReferenceError. | Guarded token rendering with `<%= typeof csrfToken !== 'undefined' ? csrfToken : '' %>` in [views/layouts/boilerplate.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/layouts/boilerplate.ejs). |

---

## 4. Runtime & Dependency Compatibility

1. **Node.js Engine Specification:**
   - Added `"engines": { "node": ">=20.x" }` to [package.json](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/package.json). This guarantees Vercel runs on Node.js 20 or higher.
2. **Native Module (`bcrypt`) Verification:**
   - Retained official `bcrypt` (`^5.1.1`).
   - `node_modules` was untracked from Git in Phase 0; therefore, Vercel will build `bcrypt` natively against its Amazon Linux glibc environment during deployment, eliminating the risk of Windows ELF binary mismatches. No switch to `bcryptjs` is required.
3. **Database Connection Reuse:**
   - Preserved `utils/db.js` global caching and request-level connection validation middleware in `app.js` with `bufferCommands: false` and `maxPoolSize: 10`.

---

## 5. Verification and Testing Results

### A. Simulation via `vercel dev`
Using Vercel CLI 54.21.0 in local simulation mode (`vercel dev --local --listen 127.0.0.1:3002 --yes`):
```text
> Ready! Available at http://127.0.0.1:3002
Connected to MongoDB: host=ac-nvi1gxn-shard-00-00.nacjyba.mongodb.net, db=EventNexus

GET /                      -> Status: 200 (Home page rendered with ejs-mate)
GET /css/style.css         -> Status: 200 (Static asset served directly via edge)
GET /js/script.js          -> Status: 200 (Static asset served directly via edge)
GET /events                -> Status: 200 (Catalog rendered with EJS views)
GET /auth/login            -> Status: 200 (Login view rendered)
GET /auth/signup           -> Status: 200 (Signup view rendered)
GET /events/invalid-id-123 -> Status: 404 (Malformed ObjectId handled gracefully)
```

### B. Automated Phase 4 Test Suite Output
```text
=== EventNexus Phase 4 Automated Verification ===

--- Test 1: Serverless Entry Point Verification ---
[PASS] api/index.js successfully exports Express application without starting a listening server
[PASS] Test harness listening on http://127.0.0.1:58682
Connected to MongoDB: host=ac-nvi1gxn-shard-00-00.nacjyba.mongodb.net, db=EventNexus
[PASS] MongoDB Atlas connection verified

--- Test 2: Static Assets and Views Traceability ---
[PASS] All static assets verified in public/ directory
[PASS] vercel.json contains valid rewrites and functions includeFiles: "views/**"

--- Test 3: Registration Success/Error Alert Feedback ---
[PASS] Registration success banner properly rendered when query ?success=registered is present
[PASS] Unregistration notice properly rendered when query ?success=unregistered is present
[PASS] Already registered warning properly rendered when query ?error=already_registered is present

--- Test 4: Null Student Reference Robustness in Admin View ---
[PASS] Admin registrations view rendered successfully without null pointer exception on deleted user

--- Test 5: Invalid and Null Date Handling Across Views ---
[PASS] Edit view rendered without error when date is null
[PASS] Show view rendered fallback "Date TBD" without error when date is null
[PASS] Index view rendered fallback "Date TBD" without error when date is null

--- Test 6: Malformed ObjectId and CastError Handling ---
[PASS] Malformed ObjectIds mapped to 404 "Event not found" rather than 500 CastError

--- Test 7: Nonexistent Valid ObjectId ---
[PASS] Nonexistent valid ObjectId correctly returned 404

--- Test 8: Runtime and Dependency Specifications ---
[PASS] package.json specifies engines.node: ">=20.x"
[PASS] Native bcrypt dependency retained without committed binaries

======================================================
ALL PHASE 4 VERCEL COMPATIBILITY TESTS PASSED
======================================================
```

### C. Database Failure Resilience Testing
- **Missing `MONGO_URI`:** Immediately throws `Error: MONGO_URI is not defined in environment variables` without crashing unhandled.
- **Unreachable Database:** Throws `MongooseServerSelectionError` within 5000ms timeout and routes cleanly to HTTP 500 database error page.

---

## 6. Remaining Deployment Prerequisites & Next Steps

Before initiating live production deployment to Vercel:
1. **Vercel Project Environment Variables:**  
   Configure the following in the Vercel Project Dashboard (Settings -> Environment Variables):
   - `NODE_ENV=production`
   - `MONGO_URI` (Atlas connection string)
   - `SESSION_SECRET` (Cryptographically secure 64+ char random string)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. **MongoDB Atlas Network Access:**  
   Ensure Atlas Network Access has `0.0.0.0/0` enabled to allow connections from dynamic Vercel serverless IPs.

Phase 4 is complete and verified. The codebase is fully prepared for live deployment.
