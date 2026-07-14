const prisma = require("../prismaClient");
const { generateEmbedding } = require("./embedding.service");
const { toPgVector } = require("../utils/vector");

async function updateArtworkEmbedding(id) {

    const artwork = await prisma.artwork.findUnique({
        where: { id }
    });

    if (!artwork) {
        console.log("Artwork not found");
        return;
    }

    const text = [
        artwork.title,
        artwork.medium,
        artwork.series,

        ...(artwork.keywords || []),
        ...(artwork.themes || []),
        ...(artwork.concepts || []),
        ...(artwork.techniques || []),
        ...(artwork.materials || []),
        ...(artwork.references || []),

        artwork.personalNotes,
    ]
        .filter(Boolean)
        .join("\n");

    console.log("Generating embedding...");

    const embedding = await generateEmbedding(text);

    console.log("Embedding dimensions:", embedding.length);

    await prisma.$executeRawUnsafe(
        `
        UPDATE "Artwork"
        SET embedding = $1::vector
        WHERE id = $2
        `,
        toPgVector(embedding),
        id
    );

    console.log("Embedding stored.");
}

module.exports = {
    updateArtworkEmbedding,
};