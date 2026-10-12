# EventNexus: Pre-Deployment Technical Audit Report

**Target System:** EventNexus (College Event Management System)  
**Author:** Antigravity Engineering Agent  
**Date:** October 12, 2026  
**Repository Working Directory:** `c:\Users\Sumit\Desktop\College Sem Projects\EventNexus Sem 3\College Event Manager`  
**Deployment Target:** Vercel (Serverless Node.js Runtime)  
**Target Database:** MongoDB Atlas  
**Target Media Storage:** Cloudinary  
**Audit Status:** Complete — Remediation Required Before Deployment  

---

## Section 1: Executive Summary

### 1.1 Current Project Architecture
EventNexus is a monolithic Model-View-Controller (MVC) web application built with Express.js, MongoDB (via Mongoose ODM), and server-rendered EJS templates using `ejs-mate` for layouts. The user interface leverages Bootstrap 5.3, FontAwesome 6.4, Chart.js, and custom CSS. Session management is handled by `express-session`, authentication utilizes `bcrypt` for password hashing, and multipart file uploads are parsed via `multer` storing files directly on local disk (`public/uploads`).

### 1.2 Current Deployment Readiness: NOT READY (NO-GO)
The application in its current state is **critically unfit for production deployment on Vercel**. Attempting to deploy the repository immediately will result in catastrophic failure across build, runtime, and security layers:
1. **Critical Privilege Escalation:** Any public user signing up can grant themselves full Administrator privileges directly via a UI dropdown (`views/auth/signup.ejs`) and unvalidated server input (`routes/auth.js`).
2. **Serverless Architecture Incompatibility:** The server does not export an Express handler, calls `app.listen()` unconditionally, relies on `MemoryStore` for sessions (dropping login state between serverless invocations), and writes uploads to an ephemeral, read-only serverless filesystem.
3. **Repository Corruption:** 2,918 `node_modules` files are committed into Git, including Windows-specific compiled native binaries (`bcrypt_lib.node`), while `.gitignore` is completely absent.
4. **Hardcoded Secrets & Infrastructure:** Database URIs are hardcoded to `mongodb://127.0.0.1:27017/collegeEvent`, session secrets are hardcoded to insecure defaults, and no environment variable loading mechanism exists.

### 1.3 Most Serious Blockers
| Blocker Category | Primary Issue | Immediate Consequence |
| :--- | :--- | :--- |
| **Security (Critical)** | Unrestricted Admin role assignment during signup | Complete system takeover by any visitor |
| **Vercel Runtime (Critical)** | `express-session` MemoryStore in serverless environment | Users logged out on every subsequent HTTP request |
| **Vercel Runtime (Critical)** | Unconditional `app.listen()` & missing `module.exports = app` | Serverless function initialization failure / port binding error |
| **Storage (Critical)** | Multer local disk storage (`public/uploads`) | File writes fail on read-only serverless disk; uploads vanish |
| **Database (Critical)** | Hardcoded local MongoDB connection string in 3 files | Database connection timeout and 500 crashes on Atlas |
| **Git / Build (High)** | Committed `node_modules` with Windows `bcrypt_lib.node` | Vercel Linux build failure / ABI architecture mismatch |
| **UI / Bundling (High)** | Missing `vercel.json` EJS view bundling (`includeFiles`) | Lambda crashes with `Failed to lookup view` |

### 1.4 Can the Existing EJS Application Reasonably Be Deployed on Vercel?
**Yes, but only with specific architectural adaptations.**  
A full rewrite to React or Next.js is **unnecessary and discouraged**. Vercel natively supports Express.js serverless functions via routing rewrites. However, Express + EJS on Vercel requires:
1. Exporting the Express `app` instance without calling `app.listen()` in production.
2. Configuring `vercel.json` to route all traffic to a serverless entry point and explicitly bundling `views/**` via `includeFiles`.
3. Swapping `MemoryStore` for MongoDB-backed session persistence (`connect-mongo`).
4. Moving image uploads to Cloudinary storage via `multer-storage-cloudinary`.
5. Enabling `app.set('trust proxy', 1)` for secure cookies behind Vercel's edge proxy.

### 1.5 Architectural Uncertainties to Resolve Before Implementation
- **Native `bcrypt` vs `bcryptjs`:** Whether to retain native `bcrypt` (relying on Vercel's Linux `node-gyp` build) or swap to pure-JS `bcryptjs` for guaranteed portability and zero native dependency footprint. (Recommendation: migrate to `bcryptjs` or ensure clean Linux build).
- **Session Lifespan & Pruning:** TTL and collection indexing for `connect-mongo` sessions in MongoDB Atlas.
- **Legacy Image Data:** Handling existing seeded Base64 data URI posters versus Cloudinary URLs.

---

## Section 2: Repository and Architecture Map

### 2.1 Actual Directory Structure
```
College Event Manager/
├── .git/                                # Git repository metadata (node_modules tracked)
├── app.js                               # Express application entry point (hardcoded local DB, app.listen)
├── package.json                         # Dependencies & npm scripts (missing dotenv, connect-mongo, cloudinary)
├── package-lock.json                    # Dependency lockfile
├── README.md                            # Documentation (contains unresolved git conflict markers)
├── schema.js                            # Joi schema for event validation
├── init/
│   ├── admin-seed.js                    # Seeds admin/student users (hardcoded credentials & local DB URI)
│   ├── data.js                          # Sample event fixtures (12 events with large Base64 data URI posters)
│   └── index.js                         # Event DB seed script (contains destructive Event.deleteMany({}))
├── middleware/
│   ├── auth.js                          # isLoggedIn, isAdmin, isStudent, attachUserToViews middleware
│   └── upload.js                        # Multer diskStorage saving to public/uploads
├── models/
│   ├── events.js                        # Event Mongoose schema
│   ├── registration.js                  # Registration Mongoose schema with compound unique index
│   └── user.js                          # User Mongoose schema with bcrypt pre-save hash & comparePassword
├── public/
│   ├── css/
│   │   └── style.css                    # Custom application styling
│   ├── js/
│   │   └── script.js                    # Client-side Bootstrap form validation script
│   └── uploads/                         # Local upload directory (empty, untracked, incompatible with Vercel)
├── routes/
│   ├── auth.js                          # /auth (signup, login, logout)
│   ├── dashboard.js                     # /dashboard (student dashboard, admin dashboard, registrations)
│   ├── events.js                        # /events (CRUD operations for events)
│   └── registration.js                  # /register (event registration & unregistration)
├── utils/
│   ├── ExpressError.js                  # Custom Error class with statusCode and message
│   └── wrapAsync.js                     # Asynchronous route error catching wrapper
└── views/
    ├── error.ejs                        # Global error alert page
    ├── home.ejs                         # Landing page with hero banner & category cards
    ├── auth/
    │   ├── login.ejs                    # User login form
    │   └── signup.ejs                   # User signup form (contains privilege escalation role selector)
    ├── dashboard/
    │   ├── admin.ejs                    # Admin analytics, stats cards, recent events table, Chart.js
    │   ├── registrations.ejs            # Admin view of registered students per event
    │   └── student.ejs                  # Student registered events view
    ├── events/
    │   ├── edit.ejs                     # Event edit form
    │   ├── index.ejs                    # Event catalog grid
    │   ├── new.ejs                      # Event creation form
    │   └── show.ejs                     # Event detail view with registration action buttons
    └── layouts/
        └── boilerplate.ejs              # Main ejs-mate layout with responsive navbar and footer
```

### 2.2 Application Entry Point and Lifecycle
- **Entry File:** `app.js`
- **Execution Flow:**
  1. Imports Express, Mongoose, path, methodOverride, ejsMate, session, ExpressError, and routes.
  2. Executes `main()` at line 23 which connects to hardcoded `'mongodb://127.0.0.1:27017/collegeEvent'`. Connection errors are logged to console without process termination or retry logic.
  3. Configures view engine (`ejs`, `views`, `ejsMate`).
  4. Mounts body parsers (`urlencoded`, `json`), `methodOverride('_method')`, and static file serving for `public/`.
  5. Configures `express-session` with default `MemoryStore`, hardcoded secret, and 7-day cookie.
  6. Mounts `attachUserToViews` middleware onto all requests.
  7. Mounts route routers (`/`, `/auth`, `/events`, `/register`, `/dashboard`).
  8. Mounts catch-all 404 handler and global error middleware rendering `error.ejs`.
  9. Executes `app.listen(3000)` at line 82. Does NOT export `app`.

### 2.3 Database Connections
- `app.js` (line 20, line 31): `MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent'`
- `init/admin-seed.js` (line 4, line 15): `MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent'`
- `init/index.js` (line 5, line 15): `MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent'`

### 2.4 Middleware and Route Dependencies
```
Incoming Request
  │
  ├──► express.urlencoded & express.json
  ├──► methodOverride("_method") (Supports ?_method=PUT / DELETE)
  ├──► express.static("public")
  ├──► session (MemoryStore)
  ├──► attachUserToViews (res.locals.currentUser)
  │
  ├──► /                  (Public home page)
  ├──► /auth              (Public signup/login, authenticated logout)
  ├──► /events            (Public index/show; isAdmin for new, create, edit, update, delete)
  │      └──► upload.single('poster') ──► validateEvent (Joi) ──► wrapAsync handler
  ├──► /register          (isStudent for POST register, DELETE unregister)
  └──► /dashboard
         ├── /student     (isStudent)
         └── /admin       (isAdmin)
```

---

## Section 3: Feature Inventory

| Feature | Routes & Files | Dependencies | Current Implementation Status | Known Defects or Risks | Required Production Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public Landing Page** | `GET /` (`app.js:61`, `views/home.ejs`) | `ejs-mate`, `boilerplate.ejs` | Functional locally | Hardcoded navigation links; static presentation | Verify asset loading and layout rendering |
| **User Signup** | `GET /auth/signup`, `POST /auth/signup` (`routes/auth.js:8-34`, `views/auth/signup.ejs`) | `models/user.js`, `bcrypt` | **CRITICAL DEFECT** | Dropdown allows user to select `admin` role; server accepts it; no password strength or email format validation; session fixation | Attempt signup with `admin` role and verify rejection; test duplicate emails |
| **User Login** | `GET /auth/login`, `POST /auth/login` (`routes/auth.js:37-70`, `views/auth/login.ejs`) | `models/user.js`, `bcrypt`, `session` | **HIGH RISK** | No brute-force protection; session fixation; redirects to `returnTo` without open-redirect validation | Verify valid/invalid credentials; verify session regeneration |
| **User Logout** | `GET /auth/logout` (`routes/auth.js:73-80`) | `express-session` | **HIGH RISK** | Uses HTTP GET (vulnerable to CSRF pre-fetch); destroys session without clearing `connect.sid` cookie | Verify session termination and cookie clearing |
| **Event Catalog** | `GET /events` (`routes/events.js:20-24`, `views/events/index.ejs`) | `models/events.js` | Functional locally | Posters fail if local paths are used on serverless; unpaginated query | Verify display of Atlas events and external poster URLs |
| **Event Details** | `GET /events/:id` (`routes/events.js:32-49`, `views/events/show.ejs`) | `models/events.js`, `models/registration.js` | Defective Alert Flow | Invalid ObjectId throws unhandled 500 CastError; client registration success alert never triggers | Test valid ID, nonexistent ID, malformed ObjectId; verify registration status display |
| **Event Creation** | `GET /events/new`, `POST /events` (`routes/events.js:26-62`, `views/events/new.ejs`) | `multer`, `schema.js`, `models/events.js` | **CRITICAL DEFECT (Vercel)** | Multer writes to local disk; disk is read-only in serverless; orphaned files if Joi validation fails | Create event with valid image, verify upload to Cloudinary; test validation failure |
| **Event Edit & Update** | `GET /events/:id/edit`, `PUT /events/:id` (`routes/events.js:64-92`, `views/events/edit.ejs`) | `multer`, `method-override`, `models/events.js` | **HIGH RISK** | Multer local storage; old image file never cleaned up; unhandled invalid ObjectId; `event.date.toISOString()` crashes if date is null | Update event details with and without new poster; verify image replacement |
| **Event Deletion** | `DELETE /events/:id` (`routes/events.js:94-104`) | `models/events.js`, `models/registration.js` | Partial Implementation | Manually deletes registrations, but poster image is never removed from storage; no Mongoose cascade hook | Delete event and verify registration cleanup and Cloudinary asset removal |
| **Event Registration** | `POST /register/:eventId` (`routes/registration.js:9-31`) | `models/registration.js`, `models/events.js` | Defective UI Feedback | Race condition on duplicate registration; `views/events/show.ejs` does not receive `success` variable so alert never displays | Concurrent registration testing; duplicate prevention verification |
| **Event Unregistration**| `DELETE /register/:eventId` (`routes/registration.js:33-40`) | `models/registration.js` | Functional locally | Redirects with query param that view ignores | Unregister flow verification |
| **Student Dashboard** | `GET /dashboard/student` (`routes/dashboard.js:9-19`, `views/dashboard/student.ejs`) | `models/registration.js` | Functional locally | Correctly checks `if (reg.eventId)` before rendering | Test with populated registrations and deleted events |
| **Admin Dashboard** | `GET /dashboard/admin` (`routes/dashboard.js:21-67`, `views/dashboard/admin.ejs`) | `models/events.js`, `models/user.js`, `models/registration.js`, Chart.js | Functional locally | High query overhead (N+1 queries for registration counts); Chart.js loaded from external CDN | Test analytics aggregation, verify chart rendering |
| **Admin Registrations**| `GET /dashboard/admin/event/:eventId/registrations` (`routes/dashboard.js:69-84`) | `models/registration.js`, `models/events.js` | **HIGH RISK** | If student record is deleted, `reg.studentId.name` throws fatal `TypeError` (no null check in view) | Test with populated students and orphaned registration records |

---

## Section 4: Findings Register

| ID | Severity | Category | Finding | Evidence | Impact | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | **Critical** | Authentication | Unrestricted Admin Role Privilege Escalation | `views/auth/signup.ejs:48-51`, `routes/auth.js:14,25` | Any anonymous visitor can register directly as an Administrator | Remove role selector from signup form; hardcode `role: 'student'` on public signup; provision admins via CLI or seed scripts |
| **SEC-002** | **Critical** | Session | Insecure MemoryStore Session Storage | `app.js:46-55` | Sessions are stored in ephemeral RAM; dropped across serverless invocations and instances | Install `connect-mongo` and configure persistent MongoDB session storage |
| **SEC-003** | **Critical** | Security | Hardcoded Session Secret | `app.js:47` | Session secret `'your-secret-key-change-in-production'` is public in source code; sessions can be forged | Load `process.env.SESSION_SECRET`; require strong 64-byte random string in production |
| **DEP-001** | **Critical** | Deployment | Serverless Incompatible Process Entry Point | `app.js:82-84` | Unconditional `app.listen()` prevents Vercel serverless function export; fails to export `app` | Wrap `app.listen()` in local environment check; add `module.exports = app` |
| **DEP-002** | **Critical** | Deployment | Missing Vercel Configuration & View Bundling | Root directory (no `vercel.json`) | Vercel will not route traffic to Express; NFT bundler will exclude `views/` folder, causing runtime view lookup crashes | Create `vercel.json` with route rewrite to serverless handler and `includeFiles: "views/**"` |
| **IMG-001** | **Critical** | Storage | Multer Disk Storage on Read-Only Serverless FS | `middleware/upload.js:6-21`, `routes/events.js:56-58,86-88` | Vercel filesystem is read-only; image uploads crash or disappear immediately upon container shutdown | Replace Multer `diskStorage` with `multer-storage-cloudinary` targeting Cloudinary |
| **DB-001** | **Critical** | Database | Hardcoded Local MongoDB URI | `app.js:20`, `init/admin-seed.js:4`, `init/index.js:5` | Application cannot connect to MongoDB Atlas; crashes on deployment | Use `process.env.MONGO_URI` with fallback for local development |
| **GIT-001** | **High** | Repository | Tracked `node_modules` with Windows Native Binaries | `git ls-files` shows 2,918 files; `bcrypt_lib.node` | Repository bloat (90MB+); Vercel Linux build will fail trying to load Windows `.node` ELF binary | Delete `node_modules` from Git index (`git rm -r --cached node_modules`); create `.gitignore` |
| **GIT-002** | **High** | Repository | Missing `.gitignore` File | Repository root | Sensitive files (`.env`), uploads, build caches, and logs can be accidentally committed | Add comprehensive `.gitignore` covering `node_modules`, `.env`, `public/uploads`, `.vercel` |
| **SEC-004** | **High** | Authentication | Session Fixation on Login and Signup | `routes/auth.js:29-31,62-64` | Existing session IDs are preserved across privilege boundary crossings | Call `req.session.regenerate()` prior to attaching `userId` and `userRole` |
| **SEC-005** | **High** | Authentication | Insecure Logout via HTTP GET Without Cookie Clearing | `routes/auth.js:73-80` | Pre-fetching or CSRF can force logout; session cookie remains in browser | Change logout to POST route; call `res.clearCookie('connect.sid')` inside `req.session.destroy` |
| **SEC-006** | **High** | Session | Missing Proxy Trust and Secure Cookie Flags | `app.js:46-55` | Behind Vercel reverse proxy, HTTPS is terminated at edge; without `trust proxy`, secure cookies fail | Add `app.set('trust proxy', 1)`; set `cookie.secure = true` and `cookie.sameSite = 'lax'` in production |
| **SEC-007** | **High** | Security | Unrestricted Rate Limiting on Auth Endpoints | `routes/auth.js:13,42` | Attackers can brute-force passwords and spam accounts | Implement `express-rate-limit` on `/auth/login` and `/auth/signup` |
| **SEC-008** | **High** | Security | Missing CSRF Protection | All `POST`/`PUT`/`DELETE` routes | Attackers can submit unauthorized requests on behalf of authenticated users | Add CSRF protection or strict SameSite cookies with origin verification |
| **DB-002** | **High** | Database | Serverless Connection Exhaustion / Lack of Caching | `app.js:23-32` | Multiple cold starts create unbounded concurrent connections to MongoDB Atlas | Implement connection caching pattern reusing existing `mongoose.connection` |
| **DB-003** | **High** | Database | Destructive Unconditional Seeding Script | `init/index.js:19-20` | Running `npm run init-db` against production Atlas will permanently delete all events | Add environment safeguards blocking `deleteMany({})` if `NODE_ENV === 'production'` |
| **UI-001** | **Medium** | View / Logic | Registration Success Alert Never Displays | `views/events/show.ejs:86-97`, `routes/events.js:48` | `success` is not passed to `res.render`, so the DOM script never triggers and users get no visual confirmation | Read query parameter `req.query.success` in route and pass to view, or check query directly in client script |
| **UI-002** | **Medium** | View / Robustness| Null Pointer Crash on Deleted Student in Admin View | `views/dashboard/registrations.ejs:49,53` | If a student account is deleted, admin registrations page crashes with `TypeError: Cannot read properties of null` | Add guard `<% if (reg.studentId) { %>` in template |
| **UI-003** | **Medium** | View / Robustness| Runtime Crash on Invalid Date in Edit Form | `views/events/edit.ejs:33` | If `event.date` is null or invalid, `event.date.toISOString()` throws runtime TypeError | Add null/validity check before calling `toISOString()` |
| **ERR-001** | **Medium** | Error Handling | Unhandled Invalid MongoDB ObjectId (CastError) | `routes/events.js:32,65,74,95`, `routes/registration.js:10,34` | Passing `/events/invalid-id` throws Mongoose CastError rendering a 500 internal server error page | Add ObjectId validation middleware or map `CastError` to 404 in global error handler |
| **IMG-002** | **Medium** | Storage | Orphaned File on Validation Failure | `routes/events.js:52`, `middleware/upload.js` | Multer writes file to disk before Joi validation; invalid events leave orphaned files | Clean up uploaded files in error middleware or upload to cloud post-validation |
| **DOC-001** | **Low** | Documentation | Git Merge Conflict Remnants in README | `README.md:79-81` | Unresolved conflict markers (`=======`, `>>>>>>>`) present in public documentation | Remove conflict markers and normalize documentation |
| **DEP-003** | **Low** | Configuration | Missing Node.js Engine Specification | `package.json` | Vercel build may default to an unsupported Node.js runtime version | Add `"engines": { "node": ">=20.x" }` to `package.json` |

---

## Section 5: MongoDB Atlas Readiness

### 5.1 Environment-Based Database Configuration
Currently, `app.js`, `init/admin-seed.js`, and `init/index.js` hardcode `mongodb://127.0.0.1:27017/collegeEvent`.  
To support MongoDB Atlas:
- In development: load connection string from `.env` using `dotenv`.
- In production (Vercel): load from `process.env.MONGO_URI` configured in Vercel Project Settings.
- Standard connection URI format for Atlas:
  `mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<dbname>?retryWrites=true&w=majority`

### 5.2 Serverless Connection Lifecycle and Reuse
In a serverless platform like Vercel, requests are executed in ephemeral stateless containers. If a new connection is opened on every invocation without connection reuse:
1. Atlas connection limits will be rapidly exhausted (Atlas M0 free tier permits only 500 concurrent connections).
2. Cold start latency will spike significantly (200–500ms per connection handshake).

**Required Pattern:**
A database connection utility module (`utils/db.js`) caching the connection promise across invocations:
```javascript
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB() {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is missing');
    }

    cachedConnection = await mongoose.connect(process.env.MONGO_URI, {
        bufferCommands: false, // Avoid buffering timeouts in serverless
        maxPoolSize: 10,       // Keep connection pool modest for serverless
        serverSelectionTimeoutMS: 5000,
    });

    return cachedConnection;
}

module.exports = connectDB;
```

### 5.3 Atlas Network Access and Security
- **Atlas IP Whitelist:** In the MongoDB Atlas console (Network Access), add `0.0.0.0/0` ("Allow access from anywhere") because Vercel serverless functions do not have static IP addresses.
- **Database User:** Create a dedicated Atlas database user with readWrite permissions restricted strictly to the `collegeEvent` database.

### 5.4 Safe Initialization and Migration
- `init/index.js` currently executes `await Event.deleteMany({})`. Running this script in production will wipe out live event records and all user registrations.
- **Safeguard:** Guard `init/index.js` and `init/admin-seed.js` against running in production:
  ```javascript
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
      console.error('Refusing to run seed script in production without FORCE_SEED=true');
      process.exit(1);
  }
  ```
- Migration of existing local data: Use `mongoexport` / `mongoimport` or a dedicated migration script connecting locally and copying documents to Atlas with transformed poster URLs.

---

## Section 6: Cloudinary Readiness

### 6.1 Current Multer Implementation Limitations
- `middleware/upload.js` uses `multer.diskStorage` writing files to `../public/uploads`.
- In Vercel, the filesystem is **read-only** (only `/tmp` is writable, and it is wiped when the container spins down).
- Any poster saved to local disk is inaccessible to other serverless instances and will result in 404 broken image links.

### 6.2 Proposed Cloudinary Architecture
```
User submits form with poster file
  │
  ├──► Multer with CloudinaryStorage (multer-storage-cloudinary)
  │      └── Directly streams file to Cloudinary API
  │
  ├──► Cloudinary generates secure HTTPS URL and public_id
  │
  ├──► Express route handler receives req.file.path (Cloudinary URL)
  │
  └──► Saves secure HTTPS URL to MongoDB Event document
```

### 6.3 Required Packages
- `cloudinary` (`^1.41.0` or `^2.x`)
- `multer-storage-cloudinary` (`^4.0.0`)

### 6.4 Event Model and Storage Flow
- **Current Model (`models/events.js`):**
  `poster: { type: String, default: "https://d12m9erqbesehq.cloudfront.net/..." }`
- **Cloudinary Compatibility:**
  Because `poster` is a `String` storing a URL, existing templates (`views/events/index.ejs`, `views/events/show.ejs`, `views/events/edit.ejs`) already render `<img src="<%= event.poster %>">`. Storing the Cloudinary HTTPS URL in `poster` requires **zero visual template changes**, preserving the existing UI design completely.

### 6.5 Create, Update, and Deletion Lifecycle
1. **Creation (`POST /events`):** If a file is uploaded, assign `newEvent.poster = req.file.path`. If no file is uploaded, fallback to the default festive banner URL.
2. **Update (`PUT /events/:id`):** If `req.file` is present, update `event.poster = req.file.path`. If no file is provided, keep the existing `event.poster`.
3. **Deletion (`DELETE /events/:id`):** When deleting an event, if `event.poster` is a Cloudinary URL, optionally extract the `public_id` and destroy the remote asset via `cloudinary.uploader.destroy(publicId)`.

### 6.6 Required Cloudinary Environment Variables
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

## Section 7: Authentication and Security Audit

### 7.1 Public Signup and Privilege Escalation (Release Blocker)
- **Defect:** In `views/auth/signup.ejs:48-51`:
  ```html
  <select id="role" name="role" class="form-select" required>
    <option value="student" selected>🎓 Student</option>
    <option value="admin">👨‍💼 Admin</option>
  </select>
  ```
  In `routes/auth.js:25`:
  ```javascript
  const newUser = new User({ name, email, password, role: role || 'student' });
  ```
- **Remediation:** Remove the `<select>` role field from `views/auth/signup.ejs`. In `routes/auth.js`, ignore any `role` in `req.body` and hardcode `role: 'student'`. Admin accounts must be created exclusively via `init/admin-seed.js` or an internal admin management panel.

### 7.2 Session Persistence and Fixation
- **MemoryStore:** `express-session` without a `store` option defaults to `MemoryStore`, which logs a warning in console and drops all sessions across serverless containers.
- **Session Fixation:** When a user logs in, `req.session.userId` is set directly without regenerating the session. An attacker with a pre-set session ID can hijack the authenticated state.
- **Fix:**
  ```javascript
  req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user._id;
      req.session.userName = user.name;
      req.session.userRole = user.role;
      res.redirect(redirectUrl);
  });
  ```

### 7.3 Secure Cookie Configuration
In `app.js`:
```javascript
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60 // 7 days
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));
```

### 7.4 Input Validation and Injection Defense
- **Auth Input Validation:** Neither `/auth/signup` nor `/auth/login` uses Joi validation. An empty email, invalid password type, or malformed input relies solely on Mongoose schema errors. Add strict Joi validation for signup (valid email format, trimmed name, minimum 6 characters password).
- **ObjectId Validation:** In `routes/events.js:33` and `routes/registration.js:15`, `findById(req.params.id)` executes with unvalidated parameters. A malformed ID (e.g., `/events/12345`) triggers Mongoose `CastError` and returns 500. A parameter validator middleware must check `mongoose.Types.ObjectId.isValid(id)` and return 404 or 400.

### 7.5 Rate Limiting and Abuse Prevention
- Deploy `express-rate-limit` on authentication endpoints:
  - Max 5 failed login attempts per 15 minutes per IP.
  - Max 10 signup attempts per hour per IP.

---

## Section 8: Vercel Compatibility Assessment

### 8.1 Express Entry Point and Serverless Adaptation
- **Current Behavior:** `app.js` runs `app.listen(port)` directly.
- **Vercel Expectation:** Vercel serverless functions require exporting the Express `app` instance (`module.exports = app;`).
- **Recommended Architecture:**
  Create an entry adapter file `api/index.js` or export `app` directly from `app.js`:
  ```javascript
  // In app.js
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
          console.log(`Server running on http://localhost:${port}`);
      });
  }
  module.exports = app;
  ```
  And `api/index.js`:
  ```javascript
  const app = require('../app');
  module.exports = app;
  ```

### 8.2 Vercel Configuration (`vercel.json`)
Without `vercel.json`, Vercel cannot determine how to route requests to the Express server or which non-code assets to bundle.
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index.js" }
  ],
  "functions": {
    "api/index.js": {
      "includeFiles": "views/**"
    }
  }
}
```

### 8.3 EJS View Bundling Gotcha (Node File Trace)
Vercel analyzes dependency graphs using `@vercel/nft` (Node File Trace). Because EJS template loading uses dynamic filesystem calls (`path.join(__dirname, "views")`), NFT **does not automatically package `.ejs` files into the lambda deployment bundle**.  
Without `"includeFiles": "views/**"`, every route rendering a view crashes in production with:
`Error: Failed to lookup view "..." in views directory "/var/task/views"`.

### 8.4 Static Assets
Public assets (`/css/style.css`, `/js/script.js`) can either be served directly via Vercel's edge CDN or via `express.static`. Using standard Vercel rewrites, static assets inside `public/` are served automatically by Vercel before hitting the rewrite rule, ensuring fast edge caching.

### 8.5 Native Module Compatibility (`bcrypt`)
- `bcrypt` uses node-gyp native C++ bindings. The repository currently has a committed Windows binary:
  `node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node`.
- Vercel executes on Amazon Linux 2 (x86_64). Loading a Windows binary will immediately fail with `invalid ELF header` or ABI mismatch.
- **Fix:** Prune `node_modules` from Git completely. When Vercel runs `npm install`, it will build `bcrypt` for Linux glibc. Alternatively, replace `bcrypt` with `bcryptjs` (pure JavaScript, identical API, zero compile requirements).

---

## Section 9: Dependency and Configuration Audit

### 9.1 Audit of Existing Dependencies
| Package | Installed Version | Purpose | Compatibility Evaluation |
| :--- | :--- | :--- | :--- |
| `express` | `^4.18.2` | Web Framework | Fully compatible with Vercel serverless |
| `ejs` | `^3.1.9` | View Engine | Compatible; requires `includeFiles` in `vercel.json` |
| `ejs-mate` | `^4.0.0` | Layout Support | Compatible with EJS 3.x |
| `express-session`| `^1.18.2` | Session Management| **Incompatible in current config**; requires `connect-mongo` |
| `mongoose` | `^8.0.3` | ODM for MongoDB | Compatible; requires connection caching & `maxPoolSize` tuning |
| `bcrypt` | `^5.1.1` | Password Hashing | Native binary; needs clean Linux install or switch to `bcryptjs` |
| `joi` | `^17.11.0` | Schema Validation | Fully compatible |
| `multer` | `^1.4.5-lts.1`| Multipart Upload | Compatible when paired with Cloudinary storage |
| `method-override`| `^3.0.0` | HTTP Verbs | Compatible with query param override (`?_method=PUT`) |
| `nodemon` | `^3.1.14` | Dev Server | Dev dependency; compatible |

### 9.2 Missing Dependencies Required for Production
1. `dotenv` (`^16.4.5`): For loading `.env` in local development.
2. `connect-mongo` (`^5.1.0`): For MongoDB Atlas session persistence.
3. `cloudinary` (`^1.41.0`): Cloudinary SDK for image hosting.
4. `multer-storage-cloudinary` (`^4.0.0`): Multer storage engine for Cloudinary.
5. `express-rate-limit` (`^7.2.0`): Brute-force and DDoS rate limiting.

### 9.3 Package Scripts
Current `package.json` scripts:
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js",
  "init-db": "node init/index.js"
}
```
**Recommended Updates:**
- Add engines: `"engines": { "node": ">=20.x" }`
- Add build safety: prevent `init-db` execution in production.

---

## Section 10: Testing and Verification Matrix

| Test ID | Feature / Scenario | Preconditions | Test Steps | Expected Result | Execution Status | Evidence / Reason Unexecuted |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TST-001** | JavaScript Syntax Verification | Node.js v22 installed | Run `node -c` on all 16 repository JS files | All files compile without syntax errors | **PASSED** | Verified via PowerShell; all 16 source files returned `OK` |
| **TST-002** | Git Tracking & Binary Audit | Git installed | Inspect `git ls-files` for `node_modules` and binaries | `node_modules` not tracked | **FAILED (Defect Confirmed)** | 2,918 files tracked in `node_modules`, including `bcrypt_lib.node` |
| **TST-003** | Merge Conflict Inspection | Workspace files | Search for git conflict markers | No conflict markers in any file | **FAILED (Defect Confirmed)** | `README.md:79-81` contains `=======` and `>>>>>>> cc59982027...` |
| **TST-004** | Vulnerability Audit | NPM installed | Run `npm audit` | 0 high/critical vulnerabilities | **FAILED (Vulnerabilities Found)** | 15 vulnerabilities reported (2 moderate, 11 high, 2 critical) |
| **TST-005** | Admin Privilege Escalation on Signup | Local DB running | POST `/auth/signup` with `role: "admin"` | Role should default to `student` | **NOT EXECUTED (Static Defect Confirmed)** | Local DB not started per audit rules; confirmed via `routes/auth.js:25` |
| **TST-006** | Session Fixation on Authentication | Local DB running | Intercept cookie before and after login | Session ID regenerated | **NOT EXECUTED (Static Defect Confirmed)** | Confirmed absent via `routes/auth.js:62-64` (`req.session.regenerate` missing) |
| **TST-007** | Multer Local Disk Write on Read-Only FS | Local server running | POST `/events` with image on Vercel | File saved persistently | **NOT EXECUTED (Platform Incompatibility)** | Local filesystem on Vercel is read-only; confirmed via `middleware/upload.js:14` |
| **TST-008** | Malformed ObjectId Error Handling | Local server running | GET `/events/invalid-hex-id` | Returns clean 400 or 404 page | **NOT EXECUTED (Static Defect Confirmed)** | Confirmed unhandled Mongoose `CastError` in `routes/events.js:33` |
| **TST-009** | Registration Success Notification Trigger | Local server running | Register for event, check show view | Visual alert displayed on show page | **NOT EXECUTED (Static Defect Confirmed)** | `routes/events.js:48` does not pass `success` to template; condition fails |
| **TST-010** | Vercel Serverless Function Invocation | Vercel deployment | Deploy to Vercel without `vercel.json` | 200 OK response on `/` | **NOT EXECUTED (Safety Rule 8)** | Deployments prohibited during audit; known Vercel routing requirement |

---

## Section 11: Prioritized Remediation Plan

```
Phase 0: Repository & Safeguards  ──►  Phase 1: Environment & Atlas  ──►  Phase 2: Cloudinary Uploads
                                                                                    │
Phase 5: Production Deployment    ◄──  Phase 4: Vercel Adaptation    ◄──  Phase 3: Auth & Security
```

### Phase 0: Security & Repository Safeguards
- **Finding IDs:** `GIT-001`, `GIT-002`, `DOC-001`
- **Files Changing:** `.gitignore` (create), `README.md`, Git index (`git rm -r --cached node_modules`)
- **Actions:**
  1. Create `.gitignore` ignoring `node_modules/`, `.env`, `public/uploads/*`, `.vercel/`, `*.log`.
  2. Untrack `node_modules` from Git history/index without deleting local folder.
  3. Clean up merge conflict markers in `README.md`.
- **Acceptance Criteria:** `git status` shows clean tracking with `node_modules` completely excluded.

### Phase 1: Environment Configuration & MongoDB Atlas
- **Finding IDs:** `DB-001`, `DB-002`, `DB-003`
- **Files Changing:** `package.json`, `app.js`, `init/index.js`, `init/admin-seed.js`, new `utils/db.js`, `.env.example`
- **Actions:**
  1. Install `dotenv`.
  2. Create `utils/db.js` with serverless connection caching pattern.
  3. Replace hardcoded connection strings in `app.js`, `init/admin-seed.js`, and `init/index.js` with `process.env.MONGO_URI`.
  4. Add production environment safeguard to `init/index.js`.
- **Acceptance Criteria:** App connects to Atlas when `MONGO_URI` is provided; caches connections across invocations.

### Phase 2: Cloudinary Integration & Persistent Posters
- **Finding IDs:** `IMG-001`, `IMG-002`
- **Files Changing:** `package.json`, `middleware/upload.js`, `routes/events.js`
- **Actions:**
  1. Install `cloudinary` and `multer-storage-cloudinary`.
  2. Reconfigure `middleware/upload.js` to stream uploads directly to Cloudinary folder `eventnexus/posters`.
  3. Ensure `routes/events.js` stores `req.file.path` (Cloudinary HTTPS URL).
  4. Ensure existing fallback URLs remain functional.
- **Acceptance Criteria:** Uploading a poster in New/Edit form uploads to Cloudinary and saves an HTTPS URL; no local disk writes occur.

### Phase 3: Authentication, Session Persistence & Production Security
- **Finding IDs:** `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `SEC-005`, `SEC-006`, `SEC-007`, `SEC-008`
- **Files Changing:** `views/auth/signup.ejs`, `routes/auth.js`, `app.js`, `middleware/auth.js`
- **Actions:**
  1. Remove role dropdown from `views/auth/signup.ejs`; enforce `role: 'student'` in `routes/auth.js`.
  2. Install `connect-mongo`; replace `MemoryStore` in `app.js` with `MongoStore.create(...)`.
  3. Add `app.set('trust proxy', 1)` and secure cookie settings in production.
  4. Implement `req.session.regenerate()` on login and signup.
  5. Convert logout to a POST action and clear the `connect.sid` cookie.
  6. Install `express-rate-limit` on `/auth/login` and `/auth/signup`.
- **Acceptance Criteria:** Anonymous users cannot register as admin; sessions survive serverless restarts in MongoDB; rate limiting blocks brute-force attempts.

### Phase 4: Vercel Configuration & Application Compatibility
- **Finding IDs:** `DEP-001`, `DEP-002`, `DEP-003`, `UI-001`, `UI-002`, `UI-003`, `ERR-001`
- **Files Changing:** `vercel.json` (create), `api/index.js` (create), `app.js`, `views/events/show.ejs`, `views/dashboard/registrations.ejs`, `routes/events.js`
- **Actions:**
  1. Export `app` in `app.js` and wrap `app.listen()` in a local-only guard.
  2. Create `api/index.js` exporting the Express app.
  3. Create `vercel.json` with route rewrites and `includeFiles: "views/**"`.
  4. Fix UI registration alert condition in `views/events/show.ejs` and `routes/events.js`.
  5. Add null check for `reg.studentId` in `views/dashboard/registrations.ejs`.
  6. Add ObjectId validation middleware for route parameters.
  7. Add `"engines": { "node": ">=20.x" }` to `package.json`.
- **Acceptance Criteria:** App compiles and renders all views locally when imported as a module; no unhandled CastErrors.

### Phase 5: Local Regression Testing & Verification
- **Actions:**
  1. Full end-to-end local test run with local MongoDB and test Cloudinary credentials.
  2. Test student signup, login, event browsing, registration, unregistration, student dashboard.
  3. Test admin login (seeded), event creation with poster, event editing, event deletion, admin dashboard, registration list print.
  4. Test edge cases: malformed IDs, oversized images, invalid login credentials.
- **Acceptance Criteria:** All regression tests pass with zero console errors or uncaught exceptions.

### Phase 6: Production Smoke Testing & Portfolio Readiness
- **Actions:**
  1. Connect GitHub repository to Vercel.
  2. Configure production environment variables in Vercel Project Settings.
  3. Perform production deployment.
  4. Execute smoke tests on the live Vercel URL.
  5. Verify live URL and update README with portfolio badges and demo credentials.
- **Acceptance Criteria:** Live Vercel site is fast, responsive, secure, and ready for portfolio showcase.

---

## Section 12: Environment Variables Checklist

| Variable Name | Purpose | Required Locally | Required in Production | Configuration Location | Example / Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Sets execution environment mode | Optional (`development`) | **Yes** (`production`) | `.env` / Vercel Settings | `production` |
| `PORT` | Local HTTP server port | Optional (defaults 3000) | No (handled by Vercel) | `.env` | `3000` |
| `MONGO_URI` | MongoDB Atlas connection string | **Yes** | **Yes** | `.env` / Vercel Settings | `mongodb+srv://user:pass@cluster.mongodb.net/collegeEvent?retryWrites=true&w=majority` |
| `SESSION_SECRET` | Secret key for signing session cookies | **Yes** | **Yes** | `.env` / Vercel Settings | Strong 64+ char random string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account identifier | **Yes** | **Yes** | `.env` / Vercel Settings | `my-college-fest` |
| `CLOUDINARY_API_KEY` | Cloudinary API access key | **Yes** | **Yes** | `.env` / Vercel Settings | `123456789012345` |
| `CLOUDINARY_API_SECRET`| Cloudinary API secret | **Yes** | **Yes** | `.env` / Vercel Settings | `abcdefghijklmnopqrstuvwxyz12345` |

---

## Section 13: Deployment Decision

### 13.1 Official Decision: NO-GO 🛑
Immediate deployment to Vercel is **strongly prohibited** until Phase 0, Phase 1, Phase 2, Phase 3, and Phase 4 remediations are completed.

### 13.2 Summary of Reasons
1. **Critical Vulnerability:** Public registration grants admin privileges upon request.
2. **Serverless Breakdown:** Session MemoryStore and local Multer diskStorage will break authentication and image uploads completely.
3. **Lambda Execution Failure:** The absence of `vercel.json` with `includeFiles: "views/**"` and unconditional `app.listen()` will cause the Vercel deployment to fail at the runtime boundary.
4. **Build Contamination:** Tracked Windows native `.node` binaries in `node_modules` will break Linux builds.

### 13.3 Recommended Target Deployment Architecture
- **Framework:** Express.js 4.x running in Vercel Serverless Function (`api/index.js`).
- **Templates:** Server-rendered EJS + `ejs-mate` bundled via `includeFiles: "views/**"`.
- **Database:** MongoDB Atlas (M0/M10) with connection caching via Mongoose.
- **Sessions:** MongoDB Atlas persistent storage via `connect-mongo`.
- **Media:** Cloudinary image hosting via `multer-storage-cloudinary`.
- **Reverse Proxy:** `app.set('trust proxy', 1)` with `SameSite=Lax` and `Secure=true` cookies.

Once Phase 0 through Phase 4 remediations are approved and implemented, EventNexus will be robust, secure, and ready for public portfolio deployment on Vercel.
