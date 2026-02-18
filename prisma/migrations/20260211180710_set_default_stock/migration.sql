/*
  Warnings:

  - Made the column `stock` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `product` MODIFY `stock` INTEGER NOT NULL DEFAULT 0;
