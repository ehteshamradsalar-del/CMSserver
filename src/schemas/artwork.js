const { z } = require('zod');

const MEDIA_CATEGORIES = [
    'PAINTING', 'DRAWING', 'SCULPTURE', 'PRINTMAKING', 'PHOTOGRAPHY', 'VIDEO_ART',
    'INSTALLATION', 'CERAMICS', 'TEXTILE_ART', 'MIXED_MEDIA', 'COLLAGE', 'DIGITAL_ART',
    'PERFORMANCE_ART', 'SOUND_ART', 'LAND_ART', 'ASSEMBLAGE', 'NEW_MEDIA', 'GLASS_ART',
    'BOOK_ART', 'STREET_ART',
];

const artworkCreateSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(300),
    year: z.number().int().min(0).max(3000).nullable().optional(),
    medium: z.string().trim().max(200).nullable().optional(),
    dimensions: z.string().trim().max(200).nullable().optional(),
    edition: z.string().trim().max(100).nullable().optional(),
    availability: z.enum(['AVAILABLE', 'SOLD', 'NOT_FOR_SALE']).optional(),
    series: z.string().trim().max(200).nullable().optional(),

    concepts: z.array(z.string()).optional(),
    techniques: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    references: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
    personalNotes: z.string().max(5000).nullable().optional(),

    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    copyright: z.string().trim().max(300).nullable().optional(),
    price: z.number().nonnegative().nullable().optional(),
    collectionId: z.number().int().positive().nullable().optional(),
});

const artworkUpdateSchema = artworkCreateSchema.partial();

const artworkListQuerySchema = z.object({
    category: z.enum(MEDIA_CATEGORIES).optional(),
    year: z.coerce.number().int().optional(),
    medium: z.string().trim().optional(),
    availability: z.enum(['AVAILABLE', 'SOLD', 'NOT_FOR_SALE']).optional(),
    sort: z.enum(['createdAt', '-createdAt', 'year', '-year', 'title', '-title']).default('-createdAt'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const artworkSearchQuerySchema = z.object({
    q: z.string().trim().min(1, 'Search query is required').max(200),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const artworkSemanticSearchQuerySchema = z.object({
    q: z.string().trim().min(1).max(500),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

const collectionCreateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    statement: z.string().trim().max(3000).nullable().optional(),
    startYear: z.number().int().min(0).max(3000).nullable().optional(),
    endYear: z.number().int().min(0).max(3000).nullable().optional(),
    category: z.enum(MEDIA_CATEGORIES).nullable().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

const collectionUpdateSchema = collectionCreateSchema.partial();

module.exports = {
    artworkCreateSchema,
    artworkUpdateSchema,
    artworkListQuerySchema,
    artworkSearchQuerySchema,
    artworkSemanticSearchQuerySchema,
    collectionCreateSchema,
    collectionUpdateSchema,
};