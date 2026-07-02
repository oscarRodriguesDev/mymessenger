-- Migration: add_message_status_enum
-- Cria enum MessageStatus e migra dados existentes

-- 1. Criar o tipo enum
CREATE TYPE "MessageStatus" AS ENUM ('nao_enviada', 'enviada', 'recebida', 'lida');

-- 2. Remover default antigo (text) antes de alterar o tipo
ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Migrar dados existentes: mapear valores antigos para os novos do enum
--    'pending' -> 'nao_enviada' (mensagens otimistas que ficaram pendentes)
--    'sent'    -> 'enviada'
--    'delivered' -> 'recebida'
--    'read'    -> 'lida'
UPDATE "messages"
SET "status" = CASE "status"
  WHEN 'pending'    THEN 'nao_enviada'
  WHEN 'sent'       THEN 'enviada'
  WHEN 'delivered'  THEN 'recebida'
  WHEN 'read'       THEN 'lida'
  ELSE 'enviada'
END;

-- 4. Alterar o tipo da coluna de TEXT para o enum
ALTER TABLE "messages"
  ALTER COLUMN "status" TYPE "MessageStatus" USING "status"::"MessageStatus",
  ALTER COLUMN "status" SET DEFAULT 'enviada'::"MessageStatus",
  ALTER COLUMN "status" SET NOT NULL;
