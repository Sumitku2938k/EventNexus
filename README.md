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

### ⚙️ Installation and Setup (Local Machine)

Follow these steps to run the project locally 👇

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/EventNexus.git
cd EventNexus
```

### 2️⃣ Install Dependencies
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
=======
nodemon app.js
>>>>>>> cc59982027b3871ffe6e5668ca5fe1bc72e40a7a
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