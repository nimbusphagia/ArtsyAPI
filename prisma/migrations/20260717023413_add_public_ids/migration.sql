/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `Comment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `CommentLike` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `PostLike` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `Repost` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicId` was added to the `Collection` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `publicId` was added to the `Comment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `publicId` was added to the `CommentLike` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `publicId` was added to the `PostLike` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `publicId` was added to the `Repost` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "publicId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "publicId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "CommentLike" ADD COLUMN     "publicId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PostLike" ADD COLUMN     "publicId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Repost" ADD COLUMN     "publicId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_publicId_key" ON "Collection"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_publicId_key" ON "Comment"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_publicId_key" ON "CommentLike"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_publicId_key" ON "PostLike"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Repost_publicId_key" ON "Repost"("publicId");
