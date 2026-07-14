const prisma = require("./prismaClient");
const { updateArtworkEmbedding } = require("./services/artworkEmbedding.service");

async function main() {

    const artworks = await prisma.artwork.findMany({
        select: {
            id: true,
            title: true,
        },
    });

    console.log(`Found ${artworks.length} artworks.`);

    for (const artwork of artworks) {

        console.log(
            `Embedding #${artwork.id} - ${artwork.title}`
        );

        await updateArtworkEmbedding(artwork.id);
    }

    console.log("Done.");

    await prisma.$disconnect();
}

main().catch(async (err) => {

    console.error(err);

    await prisma.$disconnect();

    process.exit(1);

});