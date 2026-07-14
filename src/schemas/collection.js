const { z } = require('zod');

const MEDIA_CATEGORIES = [
    'PAINTING', 'DRAWING', 'SCULPTURE', 'PRINTMAKING', 'PHOTOGRAPHY', 'VIDEO_ART',
    'INSTALLATION', 'CERAMICS', 'TEXTILE_ART', 'MIXED_MEDIA', 'COLLAGE', 'DIGITAL_ART',
    'PERFORMANCE_ART', 'SOUND_ART', 'LAND_ART', 'ASSEMBLAGE', 'NEW_MEDIA', 'GLASS_ART',
    'BOOK_ART', 'STREET_ART',
];

const collectionCreateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    statement: z.string().trim().max(3000).nullable().optional(),
    startYear: z.number().int().min(0).max(3000).nullable().optional(),
    endYear: z.number().int().min(0).max(3000).nullable().optional(),
    category: z.enum(MEDIA_CATEGORIES).nullable().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

// Updates allow partial data — you don't have to resend every field, just what's changing
const collectionUpdateSchema = collectionCreateSchema.partial();

module.exports = {
    collectionCreateSchema,
    collectionUpdateSchema,
};