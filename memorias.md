Modificações recentes detectadas: arquivos package.json e package-lock.json foram modificados. | AUTOR: USUARIO

Corrigido ChatArea.tsx: nomes das colunas no filtro e payload do Supabase Realtime estavam em snake_case (conversation_id, sender_id, etc.) mas Prisma mapeia as colunas em camelCase (conversationId, senderId, etc.) — isso impedia o recebimento de novas mensagens em tempo real. | AUTOR: VIBECODE

Implementado comportamento estilo WhatsApp no ChatArea.tsx: (1) Envio otimista - mensagem aparece imediatamente na tela ao enviar e limpa o input; (2) Ícones de status - relógio girando (pending), 1 tick cinza (sent), 2 ticks cinza (delivered), 2 ticks azuis (read); (3) Atualização automática via Supabase Realtime; (4) Endpoint PATCH /api/messages/[messageId]/status para atualizar status. | AUTOR: VIBECODE

Criado enum MessageStatus no Prisma (nao_enviada, enviada, recebida, lida) e migrado campo status de String para o enum no banco PostgreSQL. Atualizados: message.service.ts, ChatArea.tsx, messages/route.ts, status/route.ts, seed.ts — todos usando o enum no lugar de strings soltas. | AUTOR: VIBECODE

Corrigido bug: ChatArea.tsx importava MessageStatus de @prisma/client (Node.js), que não funciona em componente client-side. Criado src/features/chat/message-status.ts com constantes que espelham o enum, resolvendo a exibição dos ícones de status no navegador. | AUTOR: VIBECODE