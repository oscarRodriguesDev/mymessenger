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

Criada página de configurações do usuário (/settings) com seções de Perfil, Foto, Contato, Segurança e Privacidade. APIs criadas: PUT /api/profile (atualizar dados), PUT /api/profile/password (alterar senha via Supabase Auth), POST /api/upload (upload de avatar para bucket Supabase photoProfile com upsert). Navigation atualizada com link de configurações (ícone engrenagem + avatar do usuário). | AUTOR: VIBECODE

Implementado Messenger Web via QR code (estilo WhatsApp Web). Criado modelo QrAuthSession no banco, APIs /api/qr/*, páginas /web-access (desktop) e /scan (mobile). Middleware bloqueia APIs no desktop exceto QR. DesktopRestriction no frontend permite rotas do fluxo QR. Usuário escaneia QR no celular e é autenticado no desktop via magic link Supabase. | AUTOR: VIBECODE

Corrigido leitor de QR code na página /scan-qr: (1) scanner agora inicia APENAS por clique do usuário ("Iniciar câmera") para garantir que o navegador solicite permissão de uso da câmera (getUserMedia vindo de gesto do usuário); (2) div #qr-reader agora fica SEMPRE no DOM (hidden quando não está escaneando) para evitar erro "Element not found" do Html5Qrcode; (3) adicionada verificação de disponibilidade de câmera ao montar o componente; (4) qrbox responsivo (80% do viewfinder) e fps aumentado para 15 para leitura mais confiável; (5) tratamento de erros mais específico (Permission, NotFound). | AUTOR: VIBECODE

## PREFERÊNCIA DO USUÁRIO (03/07/2026)
- **Branch a usar daqui em diante:** `vibecode`
- **Branch obsoleta (não usar mais):** `v0/melhoria-visual-da-aplicacao-d7f71782`
- Todo código deve ser mantido atualizado na branch `vibecode` | AUTOR: USUARIO
- **Commits:** Só commitar alterações quando o usuário pedir **expressamente**. Não commitar automaticamente ao finalizar tarefas. | AUTOR: USUARIO

Implementada aplicação web restrita para desktop (/web): (1) criado modelo WebSession no Prisma com expiração de 7 dias; (2) criado web-session.service.ts para gerenciar sessões; (3) criada página /web com chat restrito (apenas envio/recebimento de mensagens) e layout desktop otimizado; (4) QR exchange agora cria WebSession e redireciona magic link para /web em vez de /chat; (5) middleware atualizado: desktop não logado → /web-access, desktop logado → /web, mobile bloqueado de /web; (6) DesktopRestriction atualizado para permitir /web; (7) criada API GET/DELETE /api/web/session para verificar e encerrar sessão web. | AUTOR: VIBECODE

## BUG FIX (03/07/2026)
- **Problema:** Após escanear QR e exchange retornar 200, o frontend redirecionava para `/web#access_token=xxx` mas voltava para `/web-access` em loop.
- **Causa raiz:** O middleware (`middleware.ts`) bloqueava TODAS as APIs no desktop exceto `/api/qr/*` e `/api/web/*`. Quando o `syncProfile()` chamava `POST /api/auth/sync`, o middleware retornava 403 (desktop + rota não permitida). Com `profile = null`, a página `/web` redirecionava de volta para `/web-access`.
- **Correção:** No middleware, desktop autenticado (que já passou pelo fluxo QR) agora tem permissão para acessar qualquer API. Adicionado `if (user) { return response; }` antes do bloqueio 403, permitindo que `syncProfile`, `/api/conversations`, `/api/messages`, etc. funcionem na versão web. | AUTOR: VIBECODE