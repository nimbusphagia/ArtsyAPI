/*
  Warnings:

  - You are about to drop the column `postId` on the `Media` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_postId_fkey";

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "postId";

-- CreateTable
CREATE TABLE "PostSlide" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL,
    "mediaId" INTEGER,
    "position" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "PostSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSlide_publicId_key" ON "PostSlide"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSlide_mediaId_key" ON "PostSlide"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSlide_postId_position_key" ON "PostSlide"("postId", "position");

-- AddForeignKey
ALTER TABLE "PostSlide" ADD CONSTRAINT "PostSlide_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSlide" ADD CONSTRAINT "PostSlide_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
