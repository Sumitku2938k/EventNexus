const crypto = require('crypto');
const ExpressError = require('../utils/ExpressError');

/**
 * Session-based CSRF protection middleware.
 * Generates and stores a unique token on the session and validates incoming mutating requests.
 */
function csrfProtection(req, res, next) {
    if (!req.session) {
        return next(new ExpressError(500, 'Session required for CSRF protection'));
    }

    // Ensure session has a CSRF token
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }

    // Pass token to all views
    res.locals.csrfToken = req.session.csrfToken;

    // Skip validation for safe read-only methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Look for token in request body, query params, or headers
    const submittedToken =
        (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        req.headers['x-csrf-token'] ||
        req.headers['csrf-token'];

    if (!submittedToken || submittedToken !== req.session.csrfToken) {
        return next(new ExpressError(403, 'CSRF validation failed: Invalid or missing token. Please reload the page.'));
    }

    next();
}

module.exports = csrfProtection;
