# EventNexus Phase 1: MongoDB Atlas and Environment Configuration Report

**Execution Date:** October 12, 2026  
**Status:** Completed Successfully (Awaiting User Review)  
**Target Repository:** `c:\Users\Sumit\Desktop\College Sem Projects\EventNexus Sem 3\College Event Manager`  
**Current Branch:** `main`  

---

## 1. Overview of Phase 1

Phase 1 established centralized, environment-driven database configuration and robust safeguards against production data loss. Hardcoded database connection strings were removed from all application and initialization files, replacing them with a shared, serverless-optimized Mongoose connection utility.

---

## 2. Files Changed and Created

| File | Status | Description of Change |
| :--- | :--- | :--- |
| `package.json` | **Modified** | Added `dotenv` dependency (`^18.0.7`). |
| `package-lock.json` | **Modified** | Updated dependency lockfile for `dotenv`. |
| `utils/db.js` | **Created** | Created centralized database connection utility with Mongoose connection pooling and caching across serverless invocations. |
| `.env.example` | **Created** | Provided clean configuration template with placeholders for local and Atlas connections. Real credentials are never stored. |
| `.env` | **Created (Ignored)** | Configured local development environment pointing to local MongoDB. Verified ignored by Git. |
| `app.js` | **Modified** | Added `dotenv` loading at top; removed hardcoded `MONGO_URI` and old `main()` connection logic; integrated `connectDB` startup call and connection verification middleware. |
| `init/index.js` | **Modified** | Replaced hardcoded `MONGO_URI` with `connectDB`; added production execution guard blocking accidental `Event.deleteMany({})`; ensured clean connection closing. |
| `init/admin-seed.js` | **Modified** | Replaced hardcoded `MONGO_URI` with `connectDB`; supported environment-driven admin credentials; added production guard; ensured clean connection closing. |

---

## 3. Environment Setup Instructions

### Local Development
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Verify `.env` contains your local database configuration:
   ```ini
   NODE_ENV=development
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/collegeEvent
   SESSION_SECRET=local-dev-session-secret-change-in-prod
   ALLOW_SEED=false
   ```
3. Start local MongoDB on port 27017, then launch the app:
   ```bash
   npm run dev
   ```

### MongoDB Atlas / Production (Vercel)
In the Vercel Project Settings (Settings > Environment Variables), configure:
- **`NODE_ENV`**: `production`
- **`MONGO_URI`**: `mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/collegeEvent?retryWrites=true&w=majority`
- **`SESSION_SECRET`**: Strong random 64+ character string
- **`ALLOW_SEED`**: `false` (default; only set to `true` temporarily when explicitly running a seed script against production)

---

## 4. Verification Tests and Actual Results

| Test ID | Test Scenario | Execution Command / Procedure | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1-T01** | Audit for Hardcoded MongoDB URIs | `git grep -i "mongodb://" -- ':!node_modules'` | No occurrences in any application or script file | **Zero occurrences in code** (only in documentation) | **PASSED** |
| **P1-T02** | Audit for Port 27017 in Code | `git grep "27017" -- ':!node_modules'` | No occurrences in any `.js` file | **Zero occurrences in JS files** | **PASSED** |
| **P1-T03** | Source Syntax Verification | `node -c` on all 17 source files | All 17 files compile without syntax errors | **All 17 files returned OK** | **PASSED** |
| **P1-T04** | Missing `MONGO_URI` Handling | Executed `connectDB()` without `process.env.MONGO_URI` | Throws explicit error without hanging | `CAUGHT EXPECTED ERROR: MONGO_URI is not defined in environment variables` | **PASSED** |
| **P1-T05** | Unreachable Host / Connection Failure | Executed `connectDB()` against unreachable port `27099` | Fails fast, logs error message without credentials | Logged `connect ECONNREFUSED 127.0.0.1:27099` in 2s; no credentials leaked | **PASSED** |
| **P1-T06** | Local Database Connection | Executed `connectDB()` with local `.env` | Successfully connects and retrieves host/dbname | Logged `Connected to MongoDB: host=127.0.0.1, db=collegeEvent` | **PASSED** |
| **P1-T07** | Connection Caching & Reuse | Executed `connectDB()` twice sequentially | Returns identical connection instance without duplicate pool | Logged `CACHING REUSE VERIFIED: true READY_STATE: 1` | **PASSED** |
| **P1-T08** | Event Seed Production Guard | Executed `node init/index.js` with `NODE_ENV=production` | Blocks execution, aborts with exit code 1 | Blocked: `❌ Refusing to run destructive event seed script in production!` (Exit 1) | **PASSED** |
| **P1-T09** | Admin Seed Production Guard | Executed `node init/admin-seed.js` with `NODE_ENV=production` | Blocks execution, aborts with exit code 1 | Blocked: `❌ Refusing to run admin seed script in production!` (Exit 1) | **PASSED** |
| **P1-T10** | MongoDB Atlas Live Connectivity | Test against live Atlas cluster | Connect to Atlas | **NOT TESTED** (Live Atlas credentials have not been configured by user) | **PENDING ATLAS SETUP** |

---

## 5. Acceptance Criteria Status

- [x] **Requirement 1:** `dotenv` added and loaded at top of `app.js` and standalone seed scripts.
- [x] **Requirement 2:** Shared `utils/db.js` created with caching for Vercel, explicit error handling, and zero credential logging.
- [x] **Requirement 3:** Hardcoded local MongoDB connection strings removed from `app.js`, `init/index.js`, and `init/admin-seed.js`.
- [x] **Requirement 4:** Local development preserved via `.env` (ignored by Git); production prepared for environment variables.
- [x] **Requirement 5:** `.env.example` created with placeholders only (no actual secrets).
- [x] **Requirement 6:** Destructive `Event.deleteMany({})` protected with production guard (`ALLOW_SEED=true` required).
- [x] **Requirement 7:** Single, unified connection manager (`utils/db.js`) shared across app and scripts.
- [x] **Requirement 8:** No existing database records were automatically cleared, migrated, or overwritten.
- [x] **Requirement 9:** Authentication, upload middleware, templates, and business logic remain untouched.

---

## 6. Remaining Risks and Prerequisites for Phase 2

1. **Atlas Credentials:** Real MongoDB Atlas credentials must be provided before production deployment can be tested against the remote cluster.
2. **Phase 2 Prerequisite (Cloudinary):** Event poster uploads still utilize Multer local disk storage (`middleware/upload.js`). Phase 2 will transition upload storage to Cloudinary so images persist in serverless environments.
3. **Phase 3 Prerequisite (Security & Session):** Session storage currently remains on `MemoryStore` in `app.js` and public admin signup vulnerability remains in `views/auth/signup.ejs` and `routes/auth.js`. These will be remediated in Phase 3.
