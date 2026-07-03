-- AlterTable: add readReceiptEnabled to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "readReceiptEnabled" BOOLEAN NOT NULL DEFAULT true;
