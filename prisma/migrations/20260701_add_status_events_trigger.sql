-- Migration: add_status_events_trigger
-- Cria tabela de eventos de status e trigger para propagar mudanças

-- 1. Criar tabela de eventos de mudança de status
CREATE TABLE IF NOT EXISTS "message_status_events" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_status_events_pkey" PRIMARY KEY ("id")
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_status_events_conversation
  ON "message_status_events"("conversation_id");

CREATE INDEX IF NOT EXISTS idx_status_events_created
  ON "message_status_events"("created_at" DESC);

-- 3. Função da trigger
CREATE OR REPLACE FUNCTION notify_message_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "message_status_events" ("id", "message_id", "conversation_id", "status")
  VALUES (gen_random_uuid()::text, NEW.id, NEW.conversation_id, NEW.status::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_message_status_change ON "messages";
CREATE TRIGGER trg_message_status_change
  AFTER UPDATE OF status ON "messages"
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_message_status_change();
