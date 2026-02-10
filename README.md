# 🎓 College Event Manager - Full Stack Application

A comprehensive college event management system built with Node.js, Express, MongoDB, and EJS. Features authentication, role-based access control, event registration, and admin dashboard.

## ✨ Features

### Authentication & Authorization
- 🔐 Secure user authentication with bcrypt password hashing
- 👥 Role-based access control (Student & Admin)
- 🔑 Session-based login system
- 🚪 Protected routes with middleware

### Event Management
- 📅 Create, Read, Update, Delete (CRUD) operations for events
- 🖼️ Image upload for event posters using Multer
- 📝 Event categories: Technical, Cultural, Sports
- 💰 Registration fee tracking
- 📍 Venue and date management

### Student Features
- ✅ One-click event registration
- 📋 Personal dashboard showing registered events
- ❌ Unregister from events
- 🔍 Browse all available events

### Admin Features
- 📊 Comprehensive admin dashboard with analytics
- 👥 View all registered students for each event
- 📈 Category-wise registration charts (Chart.js)
- 🎯 Total events, students, and registrations overview
- 🛠️ Full event management capabilities

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Step 1: Clone and Install Dependencies
```bash
# Install all dependencies
npm install
```

### Step 2: Start MongoDB
```bash
# Make sure MongoDB is running on localhost:27017
mongod
```

### Step 3: Initialize Database with Sample Data
```bash
# This will populate events
node init/index.js

# This will create default admin and student users
node init/admin-seed.js
```

### Step 4: Start the Application
```bash
# For development (with nodemon)
npm run dev

# For production
npm start
```

### Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 👤 Default Login Credentials

### Admin Account
- **Email:** admin@college.edu
- **Password:** admin123

### Student Account
- **Email:** student@college.edu
- **Password:** student123

⚠️ **IMPORTANT:** Change these passwords in production!

## 📁 Project Structure
```
College Event Manager
├── app.js                      # Main application file
├── package.json                # Dependencies
├── models/
│   ├── events.js              # Event schema
│   ├── user.js                # User schema with authentication
│   └── registration.js        # Registration schema
├── routes/
│   ├── auth.js                # Authentication routes
│   ├── events.js              # Event CRUD routes
│   ├── registration.js        # Registration routes
│   └── dashboard.js           # Dashboard routes
├── middleware/
│   ├── auth.js                # Authentication middleware
│   └── upload.js              # Multer configuration
├── views/
│   ├── layouts/
│   │   └── boilerplate.ejs   # Main layout with dynamic navbar
│   ├── auth/
│   │   ├── login.ejs         # Login page
│   │   └── signup.ejs        # Signup page
│   ├── events/
│   │   ├── index.ejs         # All events listing
│   │   ├── show.ejs          # Event details with registration
│   │   ├── new.ejs           # Create event (with file upload)
│   │   └── edit.ejs          # Edit event (with file upload)
│   ├── dashboard/
│   │   ├── student.ejs       # Student dashboard
│   │   ├── admin.ejs         # Admin dashboard with charts
│   │   └── registrations.ejs # Event registrations list
│   ├── home.ejs              # Landing page
│   └── error.ejs             # Error page
├── public/
│   ├── css/
│   │   └── style.css         # Custom styles
│   ├── js/
│   │   └── script.js         # Client-side validation
│   └── uploads/              # Uploaded event posters
├── init/
│   ├── index.js              # Database initialization
│   ├── data.js               # Sample event data
│   └── admin-seed.js         # Create default users
├── utils/
│   ├── ExpressError.js       # Custom error class
│   └── wrapAsync.js          # Async error wrapper
└── schema.js                  # Joi validation schema
```

## 🔑 Key Features Explained

### 1. Authentication System
- **Password Security:** Passwords are hashed using bcrypt before storage
- **Session Management:** Uses express-session for maintaining user sessions
- **Middleware Protection:** Routes are protected with `isLoggedIn`, `isAdmin`, `isStudent`

### 2. File Upload System
- **Multer Integration:** Handles event poster uploads
- **File Validation:** Only accepts image files (JPG, PNG, GIF, WEBP)
- **Size Limit:** Maximum 5MB per image
- **Storage:** Images stored in `public/uploads/` directory

### 3. Registration System
- **Duplicate Prevention:** Compound index prevents multiple registrations
- **Real-time Status:** Shows if student is already registered
- **Admin Visibility:** Admins can view all registrations per event

### 4. Role-Based Access Control
- **Students Can:**
  - Browse all events
  - Register/unregister for events
  - View their registration dashboard
  
- **Admins Can:**
  - All student capabilities
  - Create, edit, delete events
  - Upload event posters
  - View analytics dashboard
  - See all registrations per event

### 5. Dashboard Analytics
- **Admin Dashboard includes:**
  - Total events count
  - Total students count
  - Total registrations count
  - Category-wise registration chart (Chart.js)
  - Recent events with registration counts
  - Quick links to manage registrations

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB

### Authentication & Security
- **bcrypt** - Password hashing
- **express-session** - Session management

### File Handling
- **Multer** - File upload middleware

### Frontend
- **EJS** - Templating engine
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons
- **Chart.js** - Data visualization

### Validation
- **Joi** - Schema validation

## 📝 API Routes

### Authentication Routes (`/auth`)
```
GET  /auth/signup       - Signup page
POST /auth/signup       - Create new user
GET  /auth/login        - Login page
POST /auth/login        - Authenticate user
GET  /auth/logout       - Logout user
```

### Event Routes (`/events`)
```
GET    /events          - List all events (Public)
GET    /events/new      - Create event form (Admin only)
POST   /events          - Create new event (Admin only)
GET    /events/:id      - Event details
GET    /events/:id/edit - Edit event form (Admin only)
PUT    /events/:id      - Update event (Admin only)
DELETE /events/:id      - Delete event (Admin only)
```

### Registration Routes (`/register`)
```
POST   /register/:eventId  - Register for event (Student only)
DELETE /register/:eventId  - Unregister from event (Student only)
```

### Dashboard Routes (`/dashboard`)
```
GET /dashboard/student                        - Student dashboard
GET /dashboard/admin                          - Admin dashboard
GET /dashboard/admin/event/:eventId/registrations - Event registrations
```

## 🔒 Security Best Practices

1. **Change Default Credentials:** Always change default admin/student passwords
2. **Session Secret:** Update the session secret in `app.js` for production
3. **Environment Variables:** Use `.env` file for sensitive data in production
4. **HTTPS:** Always use HTTPS in production
5. **Input Validation:** All inputs are validated using Joi schema
6. **File Upload Security:** File type and size restrictions are enforced

## 🎨 Customization

### Adding New Event Categories
Edit `models/events.js`:
```javascript
category: { 
  type: String, 
  enum: ["Technical", "Cultural", "Sports", "Workshop", "Seminar"], 
  required: true 
}
```

### Changing Session Duration
Edit `app.js`:
```javascript
cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    maxAge: 1000 * 60 * 60 * 24 * 30
}
```

### Modifying Upload Size Limit
Edit `middleware/upload.js`:
```javascript
limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
```

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Error
**Solution:** Ensure MongoDB is running on port 27017
```bash
mongod --port 27017
```

### Issue: Session Not Persisting
**Solution:** Check that you have session middleware before routes in `app.js`

### Issue: File Upload Not Working
**Solution:** 
1. Ensure `public/uploads/` directory exists
2. Check form has `enctype="multipart/form-data"`
3. Verify file size is under limit

### Issue: Cannot Access Admin Routes
**Solution:** Login with admin credentials (admin@college.edu)

## 📊 Future Enhancements

- [ ] Email notifications for event registrations
- [ ] Payment gateway integration for registration fees
- [ ] QR code generation for event tickets
- [ ] Calendar view for events
- [ ] Event capacity limits
- [ ] Waiting list functionality
- [ ] Export registrations to CSV/PDF
- [ ] Email verification for signup
- [ ] Password reset functionality
- [ ] Social media sharing for events

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements.

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Created with ❤️ for college event management

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Happy Event Managing! 🎉**