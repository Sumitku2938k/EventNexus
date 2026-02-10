// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl; // Save the URL user tried to access
        return res.redirect('/auth/login');
    }
    next();
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    if (req.session.userRole !== 'admin') {
        return res.status(403).render('error.ejs', { 
            message: 'Access Denied: Admin privileges required' 
        });
    }
    next();
};

// Middleware to check if user is student
const isStudent = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    if (req.session.userRole !== 'student') {
        return res.status(403).render('error.ejs', { 
            message: 'Access Denied: Student account required' 
        });
    }
    next();
};

// Middleware to attach user info to all views
const attachUserToViews = (req, res, next) => {
    res.locals.currentUser = {
        id: req.session.userId || null,
        name: req.session.userName || null,
        role: req.session.userRole || null,
        isLoggedIn: !!req.session.userId
    };
    next();
};

module.exports = { isLoggedIn, isAdmin, isStudent, attachUserToViews };