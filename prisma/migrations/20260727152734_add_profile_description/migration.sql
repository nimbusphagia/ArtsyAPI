/*
  Warnings:

  - Added the required column `description` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PostSlide" DROP CONSTRAINT "PostSlide_mediaId_fkey";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "description" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "PostSlide" ADD CONSTRAINT "PostSlide_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
