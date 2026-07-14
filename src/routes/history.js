const express = require('express');
const prisma = require('../prismaClient');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { exhibitionEntrySchema, publicationEntrySchema } = require('../schemas/history');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const router = express.Router();

// Shared helper: confirm the artwork exists and the requester owns it
async function getOwnedArtwork(artworkId, req) {
    const artwork = await prisma.artwork.findUnique({ where: { id: Number(artworkId) } });
    if (!artwork) throw new ApiError(404, 'Artwork not found');
    if (artwork.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this artwork');
    }
    return artwork;
}

// --- Exhibition history ---

router.post(
    '/artwork/:artworkId/exhibitions',
    requireAuth,
    validate(exhibitionEntrySchema),
    asyncHandler(async (req, res) => {
        await getOwnedArtwork(req.params.artworkId, req);

        const entry = await prisma.exhibitionEntry.create({
            data: {
                artworkId: Number(req.params.artworkId),
                exhibitionName: req.body.exhibitionName,
                venue: req.body.venue || null,
                location: req.body.location || null,
                year: req.body.year || null,
            },
        });
        res.status(201).json(entry);
    })
);

router.delete(
    '/exhibitions/:entryId',
    requireAuth,
    asyncHandler(async (req, res) => {
        const entry = await prisma.exhibitionEntry.findUnique({
            where: { id: Number(req.params.entryId) },
            include: { artwork: true },
        });
        if (!entry) throw new ApiError(404, 'Not found');
        if (entry.artwork.artistId !== req.user.artistId) {
            throw new ApiError(403, 'You do not own this artwork');
        }

        await prisma.exhibitionEntry.delete({ where: { id: entry.id } });
        res.status(204).send();
    })
);

// --- Publication history ---

router.post(
    '/artwork/:artworkId/publications',
    requireAuth,
    validate(publicationEntrySchema),
    asyncHandler(async (req, res) => {
        await getOwnedArtwork(req.params.artworkId, req);

        const entry = await prisma.publicationEntry.create({
            data: {
                artworkId: Number(req.params.artworkId),
                title: req.body.title,
                publisher: req.body.publisher || null,
                year: req.body.year || null,
                url: req.body.url || null,
            },
        });
        res.status(201).json(entry);
    })
);

router.delete(
    '/publications/:entryId',
    requireAuth,
    asyncHandler(async (req, res) => {
        const entry = await prisma.publicationEntry.findUnique({
            where: { id: Number(req.params.entryId) },
            include: { artwork: true },
        });
        if (!entry) throw new ApiError(404, 'Not found');
        if (entry.artwork.artistId !== req.user.artistId) {
            throw new ApiError(403, 'You do not own this artwork');
        }

        await prisma.publicationEntry.delete({ where: { id: entry.id } });
        res.status(204).send();
    })
);

module.exports = router;