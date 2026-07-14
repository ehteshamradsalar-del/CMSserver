const prisma = require("../prismaClient");
const { updateArtworkEmbedding } = require("../services/artworkEmbedding.service");

async function main() {
    const artworks = await prisma.$queryRawUnsafe(`
        SELECT id, title
        FROM "Artwork"
        WHERE embedding IS NULL
        ORDER BY id
    `);

    console.log(`Found ${artworks.length} artworks without embeddings.`);

    for (const artwork of artworks) {
        console.log(
            `Generating embedding for #${artwork.id}: ${artwork.title}`
        );

        try {
            await updateArtworkEmbedding(Number(artwork.id));
            console.log("✓ Done");
        } catch (err) {
            console.error(
                `✗ Failed for artwork ${artwork.id}`
            );
            console.error(err);
        }
    }

    console.log("Backfill complete.");

    await prisma.$disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});