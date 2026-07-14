-- AlterTable
ALTER TABLE "Artwork" ALTER COLUMN "personalNotes" DROP NOT NULL,
ALTER COLUMN "personalNotes" SET DATA TYPE TEXT;
