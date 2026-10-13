if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const ExpressError = require('./utils/ExpressError');
const connectDB = require('./utils/db');

// Import Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registration');
const dashboardRoutes = require('./routes/dashboard');

// Import Middleware
const { attachUserToViews } = require('./middleware/auth');
const csrfProtection = require('./middleware/csrf');

// Proxy Trust (Required for Vercel/reverse proxies)
app.set('trust proxy', 1);

// Initial MongoDB Connection
connectDB().catch((err) => {
    console.error('Initial MongoDB connection error:', err.message);
});

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration with MongoStore
const isProduction = process.env.NODE_ENV === 'production';

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    crypto: {
        secret: process.env.SESSION_SECRET || 'eventnexus-session-crypto-key'
    },
    touchAfter: 24 * 3600 // Lazy session update once every 24h unless modified
});

sessionStore.on('error', (err) => {
    console.error('Session store error:', err.message);
});

app.use(session({
    store: sessionStore,
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Attach user info to all views
app.use(attachUserToViews);

// CSRF Protection Middleware
app.use(csrfProtection);

// Database connection check middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        next(new ExpressError(500, 'Database connection error: Unable to connect to database'));
    }
});

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
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Requested resource not found';
    } else if (err.name === 'MulterError') {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'Uploaded file is too large. Maximum allowed size is 5MB.';
        } else {
            message = `File upload error: ${err.message}`;
        }
    }
    res.status(statusCode).render("error.ejs", { message });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;