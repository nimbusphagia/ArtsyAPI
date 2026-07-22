/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Block` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicId` was added to the `Block` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `publicId` was added to the `Follow` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "publicId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "publicId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Block_publicId_key" ON "Block"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_publicId_key" ON "Follow"("publicId");
