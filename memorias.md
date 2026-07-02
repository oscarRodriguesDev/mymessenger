Modificações recentes detectadas: arquivos package.json e package-lock.json foram modificados. | AUTOR: USUARIO

Corrigido ChatArea.tsx: nomes das colunas no filtro e payload do Supabase Realtime estavam em snake_case (conversation_id, sender_id, etc.) mas Prisma mapeia as colunas em camelCase (conversationId, senderId, etc.) — isso impedia o recebimento de novas mensagens em tempo real. | AUTOR: VIBECODE

Implementado comportamento estilo WhatsApp no ChatArea.tsx: (1) Envio otimista - mensagem aparece imediatamente na tela ao enviar e limpa o input; (2) Ícones de status - relógio girando (pending), 1 tick cinza (sent), 2 ticks cinza (delivered), 2 ticks azuis (read); (3) Atualização automática via Supabase Realtime; (4) Endpoint PATCH /api/messages/[messageId]/status para atualizar status. | AUTOR: VIBECODE

Criado enum MessageStatus no Prisma (nao_enviada, enviada, recebida, lida) e migrado campo status de String para o enum no banco PostgreSQL. Atualizados: message.service.ts, ChatArea.tsx, messages/route.ts, status/route.ts, seed.ts — todos usando o enum no lugar de strings soltas. | AUTOR: VIBECODE

Corrigido bug: ChatArea.tsx importava MessageStatus de @prisma/client (Node.js), que não funciona em componente client-side. Criado src/features/chat/message-status.ts com constantes que espelham o enum, resolvendo a exibição dos ícones de status no navegador. | AUTOR: VIBECODE

Corrigido Realtime: filtros usavam camelCase (conversationId) mas o Supabase Realtime usa nomes reais das colunas do banco (conversation_id). Também corrigido o acesso ao payload que estava lendo campos undefined (conversationId → conversation_id). Refatorado: marcação de leitura agora é feita diretamente no callback de INSERT (removeu useEffect de markAsRead). | AUTOR: VIBECODE

Implementado trigger no banco: criada tabela message_status_events + trigger trg_message_status_change que insere evento quando status da mensagem muda. Frontend escuta INSERT na tabela via Realtime para atualizar status em tempo real. Removeu lógica de Broadcast (não confiável). | AUTOR: VIBECODE

Estado atual: status funciona via trigger → INSERT Realtime → frontend atualiza em tempo real. Pendente: issue no ícone de status que mostrava a palavra "lida" (já corrigido). | AUTOR: VIBECODE

Criada migração manual `20260702000001_add_message_status_enum_and_status_events` para sincronizar schema Prisma (que já estava com enum MessageStatus) com o banco PostgreSQL. O banco ainda tinha a coluna `status` como TEXT (criado na migração inicial), causando erro `ColumnNotFound` no driver adapter do Prisma ao tentar `prisma.message.update()`. A migração manual converteu a coluna para o enum nativo do PostgreSQL e criou a tabela `message_status_events` que estava faltando. | AUTOR: VIBECODE

Corrigida trigger `trg_message_status_change` que estava com nomes de colunas em snake_case (message_id, conversation_id) mas a tabela `message_status_events` foi recriada com camelCase (messageId, conversationId). Isso causava erro `ColumnNotFound` no `prisma.message.update()` porque a trigger falhava ao tentar inserir em `message_status_events`. Recriada trigger e função com nomes corretos. Também corrigidos filtros do Realtime no ChatArea.tsx para usar camelCase nos nomes das colunas. | AUTOR: VIBECODE