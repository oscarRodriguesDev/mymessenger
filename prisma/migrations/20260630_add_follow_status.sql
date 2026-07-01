-- Adicionar campo status na tabela contacts
ALTER TABLE contacts ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted';

-- Criar enum para status
-- pending: solicitação enviada, aguardando resposta
-- accepted: seguem-se mutuamente (amigos)
-- rejected: solicitação rejeitada

-- Atualizar registros existentes para accepted (já são contatos)
UPDATE contacts SET status = 'accepted';

-- Criar índice para buscas por status
CREATE INDEX idx_contacts_status ON contacts(status) WHERE status = 'pending';

-- Criar view para amigos (relações mútuas)
CREATE OR REPLACE VIEW friends AS
SELECT
  c1.userId as user1_id,
  c2.userId as user2_id,
  c1.createdAt as since
FROM contacts c1
JOIN contacts c2 ON c1.contactId = c2.userId AND c2.contactId = c1.userId
WHERE c1.status = 'accepted' AND c2.status = 'accepted';
