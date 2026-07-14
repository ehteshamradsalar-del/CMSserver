const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const artworkRoutes = require('./routes/artworks');
const mediaRoutes = require('./routes/media');
const collectionRoutes = require('./routes/collections');
const historyRoutes = require('./routes/history');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiters');

const app = express();

// crossOriginResourcePolicy is relaxed to "cross-origin" because the frontend
// (localhost:5173) and this API (localhost:4000) run on different origins —
// helmet's default would otherwise silently block artwork images loading
// in <img> tags from /uploads.
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Applies to every /api request — generous, just guards against abuse.
app.use('/api', generalLimiter);

// A stricter limit specifically on top of auth routes — the real
// brute-force protection for login/signup.
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/artworks', artworkRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => res.json({ status: 'CMS API running' }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));