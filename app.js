const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require('express-session');
const ExpressError = require('./utils/ExpressError');

// Import Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registration');
const dashboardRoutes = require('./routes/dashboard');

// Import Middleware
const { attachUserToViews } = require('./middleware/auth');

const MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent';

// MongoDB Connection
main()
    .then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });

async function main() {
    await mongoose.connect(MONGO_URI);
}

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
app.use(session({
    secret: 'your-secret-key-change-in-production', // Change this in production!
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

// Attach user info to all views
app.use(attachUserToViews);

// Home Route
app.get('/', (req, res) => {
    res.render("home.ejs");
});

// Routes
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/register', registrationRoutes);
app.use('/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res, next) => {
    next(new ExpressError(404, 'Page Not Found'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    let { statusCode = 500, message = 'Something went wrong' } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});