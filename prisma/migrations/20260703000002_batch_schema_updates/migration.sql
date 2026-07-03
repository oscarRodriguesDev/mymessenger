-- AlterTable: User - add typingIndicatorEnabled
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "typingIndicatorEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Conversation - add ephemeral fields
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "isEphemeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "defaultTTL" INTEGER;

-- AlterTable: Message - add dedup + TTL + media fields
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "clientMessageId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileName" TEXT;

-- CreateIndex / UniqueConstraint: Message dedup
CREATE UNIQUE INDEX IF NOT EXISTS "messages_senderId_clientMessageId_key" ON "messages"("senderId", "clientMessageId");
CREATE INDEX IF NOT EXISTS "messages_clientMessageId_idx" ON "messages"("clientMessageId");

-- CreateTable: Reaction
CREATE TABLE IF NOT EXISTS "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Reaction
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "Reaction_messageId_idx" ON "Reaction"("messageId");

-- AddForeignKey: Reaction -> Message
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Reaction -> User
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
