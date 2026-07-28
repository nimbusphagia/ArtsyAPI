/*
  Warnings:

  - A unique constraint covering the columns `[collectionId,postId]` on the table `CollectionPost` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[collectionId,position]` on the table `CollectionPost` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CollectionPost" DROP CONSTRAINT "CollectionPost_postId_fkey";

-- DropIndex
DROP INDEX "CollectionPost_collectionId_postId_position_key";

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPost_collectionId_postId_key" ON "CollectionPost"("collectionId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPost_collectionId_position_key" ON "CollectionPost"("collectionId", "position");

-- AddForeignKey
ALTER TABLE "CollectionPost" ADD CONSTRAINT "CollectionPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
