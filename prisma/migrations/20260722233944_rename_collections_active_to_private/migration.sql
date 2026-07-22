/*
  Warnings:

  - You are about to drop the column `active` on the `Collection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "active",
ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false;
