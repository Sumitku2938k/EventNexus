# EventNexus - College Event Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud-forestgreen.svg)](https://www.mongodb.com/atlas)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-blue.svg)](https://cloudinary.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black.svg)](https://vercel.com/)

A full-stack college event management platform built for universities, student clubs, and campus organizations. EventNexus streamlines campus event discovery, attendee registration, media management, and administrative oversight within a secure, serverless architecture.

---

## 🌐 Live Deployment

- **Production URL:** [https://eventnexus.vercel.app](https://eventnexus.vercel.app) *(or your deployed Vercel domain)*
- **Status:** Production Ready

---

## 🌟 Key Features

### 🎓 Student Experience
- **Interactive Event Catalog:** Browse upcoming campus events categorized by **Technical**, **Cultural**, and **Sports**.
- **Real-Time Registration:** One-click registration with instant capacity verification and duplicate registration prevention.
- **Student Dashboard:** View registered events, schedule details, and unregister from events at any time.
- **Secure Authentication:** Account creation with email uniqueness checks, secure password hashing (`bcrypt`), and persistent session tracking.

### 🛡️ Administrator & Organizer Experience
- **Interactive Analytics Dashboard:** Real-time metrics tracking total events, student registrations, revenue, and category distribution via Chart.js.
- **Event Lifecycle Management:** Full CRUD capabilities for event schedules, venues, entry fees, and descriptions.
- **Cloud Media Uploads:** High-resolution event poster uploads directly managed through Cloudinary with automatic cleanup of replaced/deleted assets.
- **Attendee Management:** Detailed registration rosters for each event with attendee names, emails, and registration timestamps.

### 🔒 Enterprise Security & Resilience
- **Persistent Cloud Sessions:** Distributed session storage in MongoDB Atlas via `connect-mongo` (survives cold starts and container restarts).
- **CSRF Defense:** Session-bound cryptographic CSRF tokens on all state-mutating requests (POST, PUT, DELETE).
- **Brute Force Protection:** Strict IP-based authentication rate limiting (`express-rate-limit`) on login endpoints.
- **Role Enforcement:** Server-side role assignment strictly forces new public signups to `student`; admin privileges require explicit database provisioning.
- **Input Validation:** Strict Joi schema validation rejecting malformed payloads and malicious property injection.
- **Safe File Uploads:** In-memory file processing (`multer.memoryStorage`) with MIME validation and binary magic-byte inspection (supports JPG, PNG, GIF, WEBP up to 5MB).
- **CastError Defense:** Global handling for malformed MongoDB ObjectIds, preventing application crashes and returning user-friendly 404 pages.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | EJS (Embedded JavaScript), `ejs-mate` layouts, Bootstrap 5, Font Awesome, Chart.js, Vanilla CSS |
| **Backend** | Node.js (>=20.x), Express.js |
| **Database** | MongoDB Atlas with Mongoose ODM (connection pooling & caching) |
| **Session Management** | `express-session`, `connect-mongo` |
| **Media Storage** | Cloudinary SDK (streaming buffer upload, automatic garbage collection) |
| **Security** | `bcrypt` (12 salt rounds), Custom CSRF Protection, `express-rate-limit`, `joi` |
| **Hosting & Runtime** | Vercel Serverless Functions (`api/index.js`, `vercel.json`) |

---

## 📐 Architecture & Serverless Model

EventNexus is optimized for deployment on Vercel's serverless infrastructure:

```
                  ┌──────────────────────────────┐
                  │        Incoming Request      │
                  └──────────────┬───────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   Vercel Edge Router   │
                     │      vercel.json      │
                     └───────────┬───────────┘
                                 │ Rewrites /(.*)
                     ┌───────────▼───────────┐
                     │ Serverless Function   │
                     │     api/index.js      │
                     └───────────┬───────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
┌──────────▼──────────┐ ┌────────▼──────────┐ ┌────────▼──────────┐
│    MongoDB Atlas    │ │  Cloudinary Media │ │     EJS Views     │
│   (Mongoose Cache)  │ │   (Buffer Upload) │ │ (includeFiles:    │
│  - Events           │ │  - Post Images    │ │   "views/**")     │
│  - Users            │ │  - Asset Deletion │ └───────────────────┘
│  - Registrations    │ └───────────────────┘
│  - Sessions         │
└─────────────────────┘
```

1. **Serverless Entry Point (`api/index.js`):** Exports the Express `app` instance without executing `app.listen()`, allowing Vercel to invoke it as a stateless serverless handler.
2. **Database Connection Reuse (`utils/db.js`):** Implements Mongoose connection caching to prevent connection starvation across serverless lambdas.
3. **Template Bundling (`vercel.json`):** Configures `includeFiles: "views/**"` to guarantee all EJS partials, components, and boilerplate templates are bundled in the deployment artifact.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [Git](https://git-scm.com/)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A free [Cloudinary](https://cloudinary.com/) media account

### 2. Clone the Repository
```bash
git clone https://github.com/Sumitku2938k/EventNexus.git
cd EventNexus
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Populate the `.env` file with your credentials:
```env
PORT=3000
NODE_ENV=development

# MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/EventNexus?retryWrites=true&w=majority

# Session Security
SESSION_SECRET=your-random-session-secret-at-least-32-chars

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 5. Run Development Server
```bash
# Starts local server with nodemon auto-restart
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables Reference

| Variable | Description | Example / Allowed Values | Required |
| :--- | :--- | :--- | :---: |
| `NODE_ENV` | Application runtime environment | `development` \| `production` | **Yes** |
| `PORT` | Local listening port (ignored in Vercel) | `3000` | No |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` | **Yes** |
| `SESSION_SECRET` | Secret key used to sign session cookies | High-entropy string | **Yes** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud identifier | String | **Yes** |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Numeric string | **Yes** |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Alphanumeric secret | **Yes** |

> [!CAUTION]
> Never commit your `.env` file or paste production credentials into source control. All sensitive keys are excluded by `.gitignore`.

---

## 🔐 Demo & Role Accounts

For evaluators and reviewers:

- **Student Access:** Register an account freely at `/auth/signup`. All public registrations are automatically assigned student privileges.
- **Administrator Access:** Admin accounts manage events and access `/dashboard/admin`. To promote a student to an administrator in development:
  ```javascript
  // Promote existing user via MongoDB Atlas console or Mongoose:
  await User.updateOne({ email: "your-email@example.com" }, { role: "admin" });
  ```

---

## 🧪 Automated Testing & Quality Assurance

EventNexus includes end-to-end regression test suites covering 38 distinct test scenarios across student workflows, administrator CRUD, media handling, and security resilience:

```bash
# Execute Phase 5 Regression Test Suite
node scratch/regression-suite.js

# Execute CSRF Hotfix Verification Suite
node scratch/test-csrf-hotfix.js
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).