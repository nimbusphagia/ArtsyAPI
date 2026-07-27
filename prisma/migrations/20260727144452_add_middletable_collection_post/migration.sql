/*
  Warnings:

  - You are about to drop the `_CollectionToPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CollectionToPost" DROP CONSTRAINT "_CollectionToPost_A_fkey";

-- DropForeignKey
ALTER TABLE "_CollectionToPost" DROP CONSTRAINT "_CollectionToPost_B_fkey";

-- DropTable
DROP TABLE "_CollectionToPost";

-- CreateTable
CREATE TABLE "CollectionPost" (
    "id" SERIAL NOT NULL,
    "publicId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "CollectionPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPost_publicId_key" ON "CollectionPost"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPost_collectionId_postId_position_key" ON "CollectionPost"("collectionId", "postId", "position");

-- AddForeignKey
ALTER TABLE "CollectionPost" ADD CONSTRAINT "CollectionPost_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPost" ADD CONSTRAINT "CollectionPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
