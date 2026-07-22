/*
  Warnings:

  - Added the required column `bannerId` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetType" ADD VALUE 'DEFAULT_PROFILE_PICTURE';
ALTER TYPE "AssetType" ADD VALUE 'DEFAULT_PROFILE_BANNER';
ALTER TYPE "AssetType" ADD VALUE 'PROFILE_BANNER';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bannerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
