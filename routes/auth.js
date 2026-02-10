const express = require('express');
const router = express.Router();
const User = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');

// GET - Signup page
router.get('/signup', (req, res) => {
    res.render('auth/signup.ejs', { error: null });
});

// POST - Signup handler
router.post('/signup', wrapAsync(async (req, res) => {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.render('auth/signup.ejs', { 
            error: 'Email already registered. Please login.' 
        });
    }
    
    // Create new user (password will be hashed automatically)
    const newUser = new User({ name, email, password, role: role || 'student' });
    await newUser.save();
    
    // Auto-login after signup
    req.session.userId = newUser._id;
    req.session.userName = newUser.name;
    req.session.userRole = newUser.role;
    
    res.redirect('/events');
}));

// GET - Login page
router.get('/login', (req, res) => {
    res.render('auth/login.ejs', { error: null });
});

// POST - Login handler
router.post('/login', wrapAsync(async (req, res) => {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
        return res.render('auth/login.ejs', { 
            error: 'Invalid email or password' 
        });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.render('auth/login.ejs', { 
            error: 'Invalid email or password' 
        });
    }
    
    // Set session
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userRole = user.role;
    
    // Redirect to saved URL or events page
    const redirectUrl = req.session.returnTo || '/events';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}));

// GET - Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;