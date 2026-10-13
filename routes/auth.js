const express = require('express');
const router = express.Router();
const User = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { authLimiter } = require('../middleware/rateLimit');

// Simple regex for email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET - Signup page
router.get('/signup', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/events');
    }
    res.render('auth/signup.ejs', { error: null });
});

// POST - Signup handler
router.post('/signup', authLimiter, wrapAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Validate input presence and format
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).render('auth/signup.ejs', {
            error: 'Full Name is required and must be at least 2 characters.'
        });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).render('auth/signup.ejs', {
            error: 'A valid email address is required.'
        });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).render('auth/signup.ejs', {
            error: 'Password must be at least 6 characters long.'
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return res.status(400).render('auth/signup.ejs', {
            error: 'Email already registered. Please login.'
        });
    }

    // Create new user - strictly assign 'student' role, ignoring any submitted role
    const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'student'
    });
    await newUser.save();

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
        if (err) {
            return next(err);
        }
        req.session.userId = newUser._id;
        req.session.userName = newUser.name;
        req.session.userRole = newUser.role;

        req.session.save((saveErr) => {
            if (saveErr) {
                return next(saveErr);
            }
            res.redirect('/events');
        });
    });
}));

// GET - Login page
router.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/events');
    }
    res.render('auth/login.ejs', { error: null });
});

// POST - Login handler
router.post('/login', authLimiter, wrapAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).render('auth/login.ejs', {
            error: 'Email and password are required.'
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        return res.status(401).render('auth/login.ejs', {
            error: 'Invalid email or password'
        });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).render('auth/login.ejs', {
            error: 'Invalid email or password'
        });
    }

    // Validate returnTo for open redirect protection
    const returnTo = req.session.returnTo;
    let redirectUrl = '/events';
    if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\')) {
        redirectUrl = returnTo;
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
        if (err) {
            return next(err);
        }
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.userRole = user.role;

        req.session.save((saveErr) => {
            if (saveErr) {
                return next(saveErr);
            }
            res.redirect(redirectUrl);
        });
    });
}));

// POST - Logout handler
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error during logout:', err.message);
        }
        res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        res.redirect('/');
    });
});

// GET - Logout fallback (safe redirect home)
router.get('/logout', (req, res) => {
    res.redirect('/');
});

module.exports = router;