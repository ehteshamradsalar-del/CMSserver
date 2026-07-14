const express = require('express');
const prisma = require('../prismaClient');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { collectionCreateSchema, collectionUpdateSchema } = require('../schemas/collection');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
    const collections = await prisma.collection.findMany({
        where: { artistId: req.user.artistId },
        include: { artworks: { include: { media: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json(collections);
}));

router.post('/', requireAuth, validate(collectionCreateSchema), asyncHandler(async (req, res) => {
    const { name, statement, startYear, endYear, visibility, category } = req.body;

    const collection = await prisma.collection.create({
        data: {
            name,
            statement,
            startYear,
            endYear,
            category: category || null,
            visibility: visibility || 'PUBLIC',
            artistId: req.user.artistId,
        },
    });
    res.status(201).json(collection);
}));

router.put('/:id', requireAuth, validate(collectionUpdateSchema), asyncHandler(async (req, res) => {
    const collection = await prisma.collection.findUnique({ where: { id: Number(req.params.id) } });
    if (!collection) throw new ApiError(404, 'Not found');
    if (collection.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this collection');
    }
    const updated = await prisma.collection.update({
        where: { id: collection.id },
        data: req.body,
    });
    res.json(updated);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    const collection = await prisma.collection.findUnique({ where: { id: Number(req.params.id) } });
    if (!collection) throw new ApiError(404, 'Not found');
    if (collection.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this collection');
    }

    await prisma.artwork.updateMany({
        where: { collectionId: collection.id },
        data: { collectionId: null },
    });

    await prisma.collection.delete({ where: { id: collection.id } });
    res.status(204).send();
}));

module.exports = router;