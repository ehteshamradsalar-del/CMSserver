const express = require('express');
const prisma = require('../prismaClient');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { artworkCreateSchema, artworkUpdateSchema, artworkListQuerySchema, artworkSearchQuerySchema, artworkSemanticSearchQuerySchema } = require('../schemas/artwork');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { updateArtworkEmbedding } = require('../services/artworkEmbedding.service');
const { generateEmbedding } = require("../services/embedding.service");
const { toPgVector } = require("../utils/vector");

const router = express.Router();

const CURATORIAL_FIELDS = ['keywords', 'themes', 'concepts', 'techniques', 'materials', 'references', 'personalNotes'];

function sanitizeArtwork(artwork, req) {
    const isOwner = req.user?.artistId === artwork.artistId;
    const isCurator = req.user?.role === 'curator';

    if (isOwner || isCurator) {
        return artwork;
    }

    const sanitized = { ...artwork };
    for (const field of CURATORIAL_FIELDS) {
        delete sanitized[field];
    }
    return sanitized;
}

function safelyUpdateEmbedding(id) {
    updateArtworkEmbedding(id).catch((err) => {
        console.error(
            `Failed to update embedding for artwork ${id}:`,
            err
        );
    });
}

router.get('/', optionalAuth, validateQuery(artworkListQuerySchema), asyncHandler(async (req, res) => {
    const requesterArtistId = req.user?.artistId;
    const { category, year, medium, availability, sort, page, limit } = req.validatedQuery;

    const visibilityFilter = {
        OR: [
            { visibility: 'PUBLIC' },
            ...(requesterArtistId ? [{ artistId: requesterArtistId }] : []),
        ],
    };

    const extraFilters = [];
    if (category) extraFilters.push({ collection: { category } });
    if (year) extraFilters.push({ year });
    if (medium) extraFilters.push({ medium: { contains: medium, mode: 'insensitive' } });
    if (availability) extraFilters.push({ availability });

    const where = extraFilters.length > 0
        ? { AND: [visibilityFilter, ...extraFilters] }
        : visibilityFilter;

    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'desc' : 'asc';

    const [artworks, total] = await Promise.all([
        prisma.artwork.findMany({
            where,
            include: { media: true, exhibitionHistory: true, publicationHistory: true },
            orderBy: { [sortField]: sortDirection },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.artwork.count({ where }),
    ]);

    const result = artworks.map((a) => sanitizeArtwork(a, req));

    res.json({
        data: result,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}));

// IMPORTANT: this must come before GET /:id, otherwise Express would try to
// match "search" itself as an :id value and return a confusing "Not found".
router.get('/search', optionalAuth, validateQuery(artworkSearchQuerySchema), asyncHandler(async (req, res) => {
    const { q, page, limit } = req.validatedQuery;
    const requesterArtistId = req.user?.artistId;
    const offset = (page - 1) * limit;

    const rankedRows = requesterArtistId
        ? await prisma.$queryRaw`
            SELECT id, ts_rank("searchVector", plainto_tsquery('english', ${q})) AS rank
            FROM "Artwork"
            WHERE "searchVector" @@ plainto_tsquery('english', ${q})
              AND ("visibility" = 'PUBLIC' OR "artistId" = ${requesterArtistId})
            ORDER BY rank DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await prisma.$queryRaw`
            SELECT id, ts_rank("searchVector", plainto_tsquery('english', ${q})) AS rank
            FROM "Artwork"
            WHERE "searchVector" @@ plainto_tsquery('english', ${q})
              AND "visibility" = 'PUBLIC'
            ORDER BY rank DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

    const countRows = requesterArtistId
        ? await prisma.$queryRaw`
            SELECT COUNT(*) AS total
            FROM "Artwork"
            WHERE "searchVector" @@ plainto_tsquery('english', ${q})
              AND ("visibility" = 'PUBLIC' OR "artistId" = ${requesterArtistId})
          `
        : await prisma.$queryRaw`
            SELECT COUNT(*) AS total
            FROM "Artwork"
            WHERE "searchVector" @@ plainto_tsquery('english', ${q})
              AND "visibility" = 'PUBLIC'
          `;

    const total = Number(countRows[0].total);
    const rankedIds = rankedRows.map((r) => Number(r.id));

    const artworks = await prisma.artwork.findMany({
        where: { id: { in: rankedIds } },
        include: { media: true, exhibitionHistory: true, publicationHistory: true },
    });

    const reordered = rankedIds
        .map((id) => artworks.find((a) => a.id === id))
        .filter(Boolean);

    const result = reordered.map((a) => sanitizeArtwork(a, req));

    res.json({
        data: result,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}));

router.get(
    "/semantic-search",
    requireAuth,
    validateQuery(artworkSemanticSearchQuerySchema),
    asyncHandler(async (req, res) => {

        const { q, limit } = req.validatedQuery;

        const embedding = await generateEmbedding(q);
        const vector = toPgVector(embedding);

        const requesterArtistId = req.user.artistId;

        const rows = await prisma.$queryRawUnsafe(
            `
            SELECT
                id,
                1 - (embedding <=> $1::vector) AS similarity
            FROM "Artwork"
            WHERE
                embedding IS NOT NULL
                AND ("visibility"='PUBLIC' OR "artistId"=$2)
            ORDER BY embedding <=> $1::vector
            LIMIT $3
            `,
            vector,
            requesterArtistId,
            limit
        );

        const ids = rows.map(r => Number(r.id));

        const artworks = await prisma.artwork.findMany({
            where: {
                id: {
                    in: ids
                }
            },
            include: {
                media: true,
                exhibitionHistory: true,
                publicationHistory: true,
            }
        });

        const ordered = ids
            .map(id => artworks.find(a => a.id === id))
            .filter(Boolean)
            .map((artwork, index) => ({
                ...sanitizeArtwork(artwork, req),
                similarity: Number(rows[index].similarity),
            }));

        res.json(ordered);

    })
);

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const artwork = await prisma.artwork.findUnique({
        where: { id: Number(req.params.id) },
        include: { media: true, exhibitionHistory: true, publicationHistory: true },
    });

    if (!artwork) throw new ApiError(404, 'Not found');

    const isOwner = req.user?.artistId === artwork.artistId;

    if (artwork.visibility === 'PRIVATE' && !isOwner) {
        throw new ApiError(403, 'This artwork is private');
    }

    res.json(sanitizeArtwork(artwork, req));
}));

router.post('/', requireAuth, validate(artworkCreateSchema), asyncHandler(async (req, res) => {
    const {
        title, year, medium, dimensions, edition, availability, series,
        keywords, themes, concepts, techniques, materials, references,
        visibility, copyright, price, collectionId,
    } = req.body;

    const artwork = await prisma.artwork.create({
        data: {
            artistId: req.user.artistId,
            title, year, medium, dimensions, edition,
            availability: availability || 'NOT_FOR_SALE',
            series,
            keywords: keywords || [],
            themes: themes || [],
            concepts: concepts || [],
            techniques: techniques || [],
            materials: materials || [],
            references: references || [],
            personalNotes: req.body.personalNotes || null,
            visibility: visibility || 'PUBLIC',
            copyright,
            price,
            collectionId: collectionId || null,
        },
    });

    res.status(201).json(artwork);

    safelyUpdateEmbedding(artwork.id);
}));

router.put('/:id', requireAuth, validate(artworkUpdateSchema), asyncHandler(async (req, res) => {
    const artwork = await prisma.artwork.findUnique({ where: { id: Number(req.params.id) } });
    if (!artwork) throw new ApiError(404, 'Not found');

    if (artwork.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this artwork');
    }

    const updated = await prisma.artwork.update({
        where: { id: artwork.id },
        data: req.body,
    });

    res.json(updated);
    safelyUpdateEmbedding(updated.id);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    const artwork = await prisma.artwork.findUnique({ where: { id: Number(req.params.id) } });
    if (!artwork) throw new ApiError(404, 'Not found');

    if (artwork.artistId !== req.user.artistId) {
        throw new ApiError(403, 'You do not own this artwork');
    }

    await prisma.artwork.delete({ where: { id: artwork.id } });
    res.status(204).send();
}));

module.exports = router;