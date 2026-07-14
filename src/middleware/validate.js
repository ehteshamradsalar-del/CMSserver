function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }
        req.body = result.data;
        next();
    };
}

function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return res.status(400).json({ error: 'Invalid query parameters', details: errors });
        }
        // Express 5 makes req.query read-only, so we can't reassign it —
        // store the validated/coerced result separately instead.
        req.validatedQuery = result.data;
        next();
    };
}

module.exports = { validate, validateQuery };