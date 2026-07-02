-- CreateEnum: MessageStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('nao_enviada', 'enviada', 'recebida', 'lida');
  END IF;
END
$$;

-- AlterTable: messages - converter status de TEXT para MessageStatus
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    EXECUTE 'ALTER TABLE "messages"
      ALTER COLUMN "status" TYPE "MessageStatus"
      USING CASE "status"::text
        WHEN ''sent'' THEN ''enviada''::"MessageStatus"
        WHEN ''received'' THEN ''recebida''::"MessageStatus"
        WHEN ''read'' THEN ''lida''::"MessageStatus"
        ELSE ''enviada''::"MessageStatus"
      END,
      ALTER COLUMN "status" SET DEFAULT ''enviada''::"MessageStatus"';
  END IF;
END
$$;

-- CreateTable: message_status_events
CREATE TABLE IF NOT EXISTS "message_status_events" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: message_status_events
CREATE INDEX IF NOT EXISTS "message_status_events_conversationId_idx" ON "message_status_events"("conversationId");
CREATE INDEX IF NOT EXISTS "message_status_events_createdAt_idx" ON "message_status_events"("createdAt" DESC);
