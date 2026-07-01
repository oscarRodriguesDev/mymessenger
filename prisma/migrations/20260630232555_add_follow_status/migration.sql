-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'accepted';

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");
