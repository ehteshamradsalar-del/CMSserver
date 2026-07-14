const rateLimit = require('express-rate-limit');

// General limiter for all API traffic — generous, just guards against abuse.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter specifically for login/signup — the actual brute-force
// protection. Counts against the same IP regardless of which email is being tried.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

module.exports = { generalLimiter, authLimiter };