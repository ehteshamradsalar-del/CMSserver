const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../prismaClient');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/artwork/:artworkId', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
    const artwork = await prisma.artwork.findUnique({ where: { id: Number(req.params.artworkId) } });
    if (!artwork) throw new ApiError(404, 'Artwork not found');
    if (artwork.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this artwork');
    }

    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const media = await prisma.media.create({
        data: {
            artworkId: artwork.id,
            type: req.body.type || 'additional',
            url: `/uploads/${req.file.filename}`,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
        },
    });

    res.status(201).json(media);
}));

module.exports = router;