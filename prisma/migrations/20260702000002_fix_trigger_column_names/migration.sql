-- Drop trigger e função existentes (se existirem com nomes errados)
DROP TRIGGER IF EXISTS trg_message_status_change ON "messages";
DROP FUNCTION IF EXISTS fn_message_status_change();

-- Recria a função com nomes de colunas corretos (camelCase)
CREATE OR REPLACE FUNCTION fn_message_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "message_status_events" ("id", "messageId", "conversationId", "status", "createdAt")
  VALUES (gen_random_uuid()::text, NEW."id", NEW."conversationId", NEW."status"::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recria a trigger para disparar AFTER UPDATE de status na tabela messages
CREATE TRIGGER trg_message_status_change
  AFTER UPDATE OF "status" ON "messages"
  FOR EACH ROW
  WHEN (OLD."status" IS DISTINCT FROM NEW."status")
  EXECUTE FUNCTION fn_message_status_change();
