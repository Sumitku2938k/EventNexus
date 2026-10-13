const rateLimit = require('express-rate-limit');
const ExpressError = require('../utils/ExpressError');

// Rate limiter for authentication endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    standardHeaders: true, // Return RateLimit-* headers in response
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    handler: (req, res, next, options) => {
        next(new ExpressError(options.statusCode, options.message));
    }
});

module.exports = { authLimiter };
