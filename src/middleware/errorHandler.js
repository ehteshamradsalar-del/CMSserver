// Custom error class so routes can throw errors with a specific HTTP status attached
class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Wraps an async route handler so any thrown/rejected error automatically
// reaches the error-handling middleware below, instead of needing a
// try/catch in every single route.
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// This must be registered LAST, after all routes, in index.js.
// Express recognizes it as an error handler because it takes 4 arguments.
function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.status) {
        return res.status(err.status).json({ error: err.message });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Record not found' });
    }
    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'A record with this value already exists' });
    }

    res.status(500).json({ error: 'Something went wrong on our end' });
}

module.exports = { ApiError, asyncHandler, errorHandler };