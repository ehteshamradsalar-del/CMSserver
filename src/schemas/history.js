const { z } = require('zod');

const exhibitionEntrySchema = z.object({
    exhibitionName: z.string().trim().min(1, 'Exhibition name is required').max(300),
    venue: z.string().trim().max(300).nullable().optional(),
    location: z.string().trim().max(300).nullable().optional(),
    year: z.number().int().min(0).max(3000).nullable().optional(),
});

const publicationEntrySchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(300),
    publisher: z.string().trim().max(300).nullable().optional(),
    year: z.number().int().min(0).max(3000).nullable().optional(),
    url: z.string().trim().url('Must be a valid URL').max(500).nullable().optional().or(z.literal('')),
});

module.exports = { exhibitionEntrySchema, publicationEntrySchema };