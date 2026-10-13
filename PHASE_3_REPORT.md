# EventNexus Phase 3: Authentication and Production Security Report

**Execution Date:** October 13, 2026  
**Status:** Completed and Verified  
**Scope:** Public signup hardening, session persistence via MongoDB Atlas (`connect-mongo`), CSRF protection, rate limiting, session fixation protection, and secure logout.

---

## 1. Summary of Changes

Phase 3 hardened the authentication, session handling, and application-level security of EventNexus without altering existing UI aesthetics or breaking core event management features.

| Component | Security Concern Addressed | Implementation Details |
| :--- | :--- | :--- |
| **Public Signup** | Insecure role elevation (tampering with role field) | Removed `<select id="role">` from `views/auth/signup.ejs`. Enforced `role: 'student'` server-side in `routes/auth.js`. |
| **Session Persistence** | MemoryStore memory leak & lack of serverless persistence | Replaced MemoryStore with `connect-mongo` using the shared Atlas connection (`MONGO_URI`). Lazy session updates with 24h `touchAfter`. |
| **Session Fixation** | Stolen or pre-session hijacking | Called `req.session.regenerate()` upon successful signup and login. |
| **CSRF Defense** | Cross-Site Request Forgery on state-modifying requests | Created `middleware/csrf.js`. Added hidden `_csrf` tokens to all EJS forms (POST/PUT/DELETE) and query parameter support for multipart uploads. |
| **Brute-Force Protection** | Credential stuffing and signup spamming | Created `middleware/rateLimit.js` (`express-rate-limit`) limiting auth endpoints to 10 requests per 15 minutes per IP. Returns 429 Too Many Requests. |
| **Secure Logout** | Incomplete session invalidation & CSRF on GET | Converted logout from `GET /auth/logout` to `POST /auth/logout` with CSRF token; added cookie clearance (`res.clearCookie('connect.sid')`) and safe fallback redirect. |
| **Open Redirect Defense** | Malicious external redirect via `returnTo` | Sanitized `returnTo` in `routes/auth.js` to ensure only local, non-protocol-relative paths (`/path`) are followed. |
| **Proxy Trust & Cookies** | Serverless / reverse-proxy compatibility | Added `app.set('trust proxy', 1)`. Configured cookies with `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 7 days`, and `secure: process.env.NODE_ENV === 'production'`. |

---

## 2. Detailed Technical Breakdown

### A. Role Security & Public Signup Hardening
1. **Template Cleanup (`views/auth/signup.ejs`):**
   - Removed the `<select id="role">` dropdown containing the admin option.
   - Preserved all styling, Bootstrap classes, responsive layout, and form validation attributes.
2. **Server-Side Enforcement (`routes/auth.js`):**
   - The signup handler strictly assigns `role: 'student'` regardless of any payload properties submitted.
   - Added input validation for `name`, `email` (regex check and normalization), and `password` (minimum 6 characters).
   - Sanitized email to lowercase and trimmed whitespace.

### B. Persistent Session Management (`connect-mongo`)
1. **Store Configuration (`app.js`):**
   ```javascript
   const sessionStore = MongoStore.create({
       mongoUrl: process.env.MONGO_URI,
       collectionName: 'sessions',
       crypto: {
           secret: process.env.SESSION_SECRET || 'eventnexus-session-crypto-key'
       },
       touchAfter: 24 * 3600 // Lazy session update
   });
   ```
2. **Session Cookie Settings:**
   ```javascript
   app.use(session({
       store: sessionStore,
       name: 'connect.sid',
       secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
       resave: false,
       saveUninitialized: false,
       cookie: {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'lax',
           maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
       }
   }));
   ```
3. **Proxy Trust:**
   - Configured `app.set('trust proxy', 1)` to allow Express to properly identify HTTPS and client IPs when deployed behind reverse proxies such as Vercel.

### C. CSRF Protection Architecture (`middleware/csrf.js`)
1. **Token Generation and Validation:**
   - Generates a cryptographically strong 32-byte hex token stored in `req.session.csrfToken`.
   - Passes `csrfToken` automatically to `res.locals.csrfToken` for access across all rendered views.
   - Bypasses safe HTTP read methods (`GET`, `HEAD`, `OPTIONS`).
   - Validates incoming mutating requests (`POST`, `PUT`, `DELETE`) across:
     - `req.body._csrf` (standard forms)
     - `req.query._csrf` (multipart file uploads before body stream resolution)
     - `x-csrf-token` / `csrf-token` headers (AJAX/Fetch)
2. **Forms Updated with CSRF Tokens:**
   - `views/auth/signup.ejs`
   - `views/auth/login.ejs`
   - `views/layouts/boilerplate.ejs` (Navbar logout form)
   - `views/events/new.ejs` (Form action query param + hidden input)
   - `views/events/edit.ejs` (Form action query param + hidden input)
   - `views/events/show.ejs` (Register, Unregister, and Delete Event forms)
   - `views/dashboard/student.ejs` (Unregister form)

### D. Rate Limiting (`middleware/rateLimit.js`)
1. **Configuration:**
   - Applied `express-rate-limit` on `POST /auth/signup` and `POST /auth/login`.
   - Threshold: 10 requests per 15-minute rolling window per IP.
   - Handled via `next(new ExpressError(429, ...))` to route cleanly through the application's central error rendering pipeline.

### E. Session Fixation & Logout Security
1. **Session Fixation Prevention:**
   - Added `req.session.regenerate()` immediately after verifying credentials on `/auth/login` and after creating a user on `/auth/signup`.
   - Cached safe redirect targets before regenerating to ensure smooth user transitions.
2. **Secure Logout (`POST /auth/logout`):**
   - Transformed logout link in `views/layouts/boilerplate.ejs` into a POST form with CSRF token while keeping Bootstrap dropdown appearance and behavior.
   - Route handler calls `req.session.destroy()` and `res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: ..., sameSite: 'lax' })`.
   - Added a safe `GET /auth/logout` fallback redirecting to `/` to protect against direct URL visits.

---

## 3. Verification and Testing Results

An automated end-to-end security verification suite was executed against the running application connected to MongoDB Atlas.

### Test Execution Summary

```text
=== EventNexus Phase 3 Automated Verification ===

[PASS] Test server started on http://127.0.0.1:53421
[PASS] MongoDB connection established
Connected to MongoDB: host=ac-nvi1gxn-shard-00-00.nacjyba.mongodb.net, db=EventNexus

--- Test 1: CSRF Protection on Mutating Requests ---
[PASS] POST request without CSRF token was rejected with 403 Forbidden
[PASS] POST request with invalid CSRF token was rejected with 403 Forbidden

--- Test 2: CSRF Token & Session Issuance ---
[PASS] Issued CSRF Token (b240df1036...) and Cookie (connect.sid)

--- Test 3: Role Tampering Prevention & Session Fixation ---
[PASS] Signup succeeded with 302 redirect to /events
[PASS] Session ID regenerated on signup (pre-auth != post-auth cookie)
[PASS] DB Verification: User role strictly set to 'student' (privilege escalation blocked)
[PASS] User password correctly hashed with bcrypt

--- Test 4: MongoDB Session Persistence ---
[PASS] Verified 41 active session document(s) in MongoDB 'sessions' collection

--- Test 5: Login Flow & Open Redirect Defense ---
[PASS] Login succeeded with 302 redirect
[PASS] Session ID regenerated on login
[PASS] Open redirect sanitizer properly restricts redirect to internal paths only

--- Test 6: Secure Logout Flow ---
[PASS] Logout successfully invalidated session and cleared connect.sid cookie
[PASS] GET /auth/logout safely redirects to / without side effects

--- Test 7: Rate Limiting on Auth Endpoints ---
[PASS] Rate limiter triggered on request #9 with HTTP 429 (Too Many Requests)

[PASS] Cleaned up temporary test users

======================================================
ALL PHASE 3 SECURITY & AUTHENTICATION VERIFICATIONS PASSED
======================================================
```

---

## 4. File Modification Inventory

- **Modified:**
  - [app.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/app.js) — Configured proxy trust, MongoStore session persistence, and CSRF protection middleware. Exported `app` instance.
  - [package.json](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/package.json) & [package-lock.json](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/package-lock.json) — Added `connect-mongo` and `express-rate-limit`.
  - [routes/auth.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/routes/auth.js) — Role enforcement, rate limiting, session regeneration, open redirect sanitization, and secure POST logout.
  - [views/auth/signup.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/auth/signup.ejs) — Removed admin role select; added hidden CSRF input.
  - [views/auth/login.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/auth/login.ejs) — Added hidden CSRF input.
  - [views/layouts/boilerplate.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/layouts/boilerplate.ejs) — Converted logout dropdown item into POST form with CSRF token.
  - [views/events/new.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/new.ejs) — Added CSRF query token to form action and hidden input.
  - [views/events/edit.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/edit.ejs) — Added CSRF query token to form action and hidden input.
  - [views/events/show.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/events/show.ejs) — Added hidden CSRF inputs to registration, unregistration, and delete event forms.
  - [views/dashboard/student.ejs](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/views/dashboard/student.ejs) — Added hidden CSRF input to unregistration form.
- **Created:**
  - [middleware/csrf.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/middleware/csrf.js) — Session-based CSRF generation and validation middleware.
  - [middleware/rateLimit.js](file:///c:/Users/Sumit/Desktop/College%20Sem%20Projects/EventNexus%20Sem%203/College%20Event%20Manager/middleware/rateLimit.js) — Rate limiter for authentication endpoints.

---

## 5. Next Phase Readiness

Phase 3 is complete and verified. The codebase is now prepared for **Phase 4: Vercel Deployment and Serverless Adaptation**, which will include configuring `vercel.json`, creating the serverless entrypoint, verifying production asset delivery, and validating deployment configurations.
