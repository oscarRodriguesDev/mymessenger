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

VibeButton removido do header do chat (chat/page.tsx) — agora o Vibe só existe dentro do menu de clipe no input de mensagens. | AUTOR: VIBECODE
AudioRecorder adaptado para WebView: (1) detecção de suporte a MediaRecorder; (2) fallback automático entre mimeTypes (audio/webm → audio/ogg → audio/mp4 → audio/mpeg → vazio); (3) blob usa o mimeType real do recorder; (4) tratamento de erros específico (NotAllowedError, NotFoundError); (5) estado "unsupported" com feedback visual "Áudio indisponível" quando o dispositivo não suporta gravação. | AUTOR: VIBECODE
- **Commits:** Só commitar alterações quando o usuário pedir **expressamente**. Não commitar automaticamente ao finalizar tarefas. | AUTOR: USUARIO
- **Arquitetura mobile:** Já existe um aplicativo nativo que instancia uma WebView carregando a URL da aplicação Next.js. Este é o formato atual e não há planos confirmados de migrar para React Native/Flutter nativo puro — isso só aconteceria se surgir necessidade futura. | AUTOR: USUARIO

Implementada aplicação web restrita para desktop (/web): (1) criado modelo WebSession no Prisma com expiração de 7 dias; (2) criado web-session.service.ts para gerenciar sessões; (3) criada página /web com chat restrito (apenas envio/recebimento de mensagens) e layout desktop otimizado; (4) QR exchange agora cria WebSession e redireciona magic link para /web em vez de /chat; (5) middleware atualizado: desktop não logado → /web-access, desktop logado → /web, mobile bloqueado de /web; (6) DesktopRestriction atualizado para permitir /web; (7) criada API GET/DELETE /api/web/session para verificar e encerrar sessão web. | AUTOR: VIBECODE

## BUG FIX (03/07/2026)

### Problema 3: Logout na web deslogava o celular também
- **Problema:** Ao clicar "Sair" na página `/web`, o usuário era deslogado do Supabase globalmente, derrubando também a sessão no celular.
- **Causa raiz:** O DELETE handler de `/api/web/session` chamava `supabase.auth.signOut()` (scope `'global'`), que revoga o refresh token no servidor, invalidando a sessão em TODOS os dispositivos.
- **Correção:** 
  1. DELETE handler agora APENAS remove a WebSession do banco de dados, **sem chamar** `signOut()` 
  2. A página `/web` chama `supabase.auth.signOut({ scope: 'local' })` no CLIENTE, que limpa os cookies do browser atual sem revogar o token no servidor
  3. O celular continua logado normalmente enquanto a sessão web é encerrada apenas no desktop | AUTOR: VIBECODE

## BUG FIX (03/07/2026)

### Problema 1: Middleware bloqueava APIs no desktop
- **Problema:** Após escanear QR e exchange retornar 200, o frontend redirecionava para `/web#access_token=xxx` mas voltava para `/web-access` em loop.
- **Causa raiz:** O middleware (`middleware.ts`) bloqueava TODAS as APIs no desktop exceto `/api/qr/*` e `/api/web/*`. Quando o `syncProfile()` chamava `POST /api/auth/sync`, o middleware retornava 403 (desktop + rota não permitida). Com `profile = null`, a página `/web` redirecionava de volta para `/web-access`.
- **Correção:** No middleware, desktop autenticado (que já passou pelo fluxo QR) agora tem permissão para acessar qualquer API. Adicionado `if (user) { return response; }` antes do bloqueio 403, permitindo que `syncProfile`, `/api/conversations`, `/api/messages`, etc. funcionem na versão web. | AUTOR: VIBECODE

### Problema 2: createBrowserClient força flowType "pkce" (CAUSA RAIZ REAL)
- **Causa raiz REAL:** `createBrowserClient` do `@supabase/ssr@0.12.0` força `flowType: "pkce"` (hardcoded na linha 40 do createBrowserClient.js, sobrescrevendo qualquer opção do usuário). Com PKCE, o GoTrueClient procura APENAS pelo parâmetro `code` na URL (código de autorização PKCE), IGNORANDO completamente `#access_token=` no hash.
  - Nosso fluxo de exchange do QR retorna `redirectTo: '/web#access_token=xxx&refresh_token=yyy...'` (formato implicit grant)
  - O GoTrueClient com PKCE não reconhece `access_token` no hash → nunca processa o login
  - Hash nunca é limpo → página `/web` entra no timeout de 20s → redireciona para `/web-access`
- **Correção:** Substituído `createBrowserClient` por uma implementação customizada que:
  1. Usa `createClient` do `@supabase/supabase-js` diretamente (NÃO o `createBrowserClient` do `@supabase/ssr`)
  2. Define `flowType: 'implicit'` para que o GoTrueClient detecte `#access_token=` no hash
  3. Implementa storage de cookies compatível com o mesmo formato do `@supabase/ssr` (base64- + base64url + chunking) para que o `createServerClient` consiga ler as sessões
  4. Mantém singleton pattern igual ao original
- **Arquivo modificado:** `src/lib/supabase/client.ts` (reescrito completamente) | AUTOR: VIBECODE

## Sistema de Círculos (Grupos Temporários) - (03/07/2026)
Implementado sistema de Círculos — grupos temporários sem admin fixo, baseados nos campos `isEphemeral` e `defaultTTL` da Conversation.

**Arquivos criados:**
1. `src/services/circle.service.ts` — Serviço com métodos: create, addMember, removeMember, getUserCircles, isMember, extendTTL. Todos os membros têm role 'member'.
2. `src/app/api/circles/route.ts` — GET (listar círculos do usuário), POST (criar círculo com name + memberIds + ttl opcional)
3. `src/app/api/circles/[id]/route.ts` — GET (detalhes), DELETE (auto-remoção, deleta se último), PATCH (extend TTL +7d)
4. `src/app/api/circles/[id]/members/route.ts` — POST (adicionar membro, qualquer membro pode)
5. `src/features/groups/CircleBadge.tsx` — Componente client: "🔥 Círculo" com tooltip "Expira em Xh" + barra de progresso + countdown
6. `src/features/groups/CreateCircleModal.tsx` — Modal de criação com: nome, seleção de contatos, seletor TTL (1h/6h/24h/3d/7d), botão "Criar Círculo 🔥"

**Exportado:** `circleService` adicionado ao `services/index.ts`

**TTL default:** 86400s (24h) | **Extend:** +7 dias (604800s) | **Build:** ✅ (erro pré-existente em reactions/route.ts não relacionado) | AUTOR: VIBECODE

## Sistema de Presença (Online/Offline) - (03/07/2026)

Implementado sistema de presença em tempo real (estilo WhatsApp Web) para mostrar quais contatos estão online/offline.

### Componentes criados:
1. **`POST /api/presence/heartbeat`** — Endpoint REST que atualiza `lastSeenAt` do usuário no banco. Chamado a cada 30s pelo hook `usePresence`.
2. **`GET /api/presence/status?userIds=...`** — Endpoint REST que retorna o status de um ou mais usuários (online/idle/offline) baseado no `lastSeenAt`.
3. **`src/hooks/usePresence.ts`** — Hook principal que combina 3 mecanismos:
   - **Supabase Realtime Presence** (instantâneo): detecta join/leave em tempo real via websocket
   - **Heartbeat REST** (a cada 30s): persiste `lastSeenAt` no banco
   - **Polling de fallback** (a cada 30s): consulta `GET /api/presence/status` para watchedUserIds
   - Limpeza automática: `beforeunload` + `visibilitychange` (untrack + heartbeat final)
4. **`src/components/OnlineIndicator.tsx`** — Componente visual: bolinha verde (online), amarela (idle), cinza (offline).
5. **`Avatar`** (`src/components/ui/avatar.tsx`) — Atualizado com props `showStatus` e `status` para exibir indicador no canto do avatar.

### Páginas atualizadas:
6. **`Sidebar`** (`src/features/chat/components/Sidebar.tsx`) — Mostra bolinha de status nos avatares da lista de conversas.
7. **`/chat`** (`src/app/(main)/chat/page.tsx`) — Header da conversa agora mostra "Online"/"Offline" abaixo do nome + bolinha no avatar. Lista de conversas também com status nos avatares.
8. **`/web`** (`src/app/(web)/web/page.tsx`) — Mesmas melhorias da página /chat: header com status + lista com status nos avatares. Footer do sidebar mostra próprio usuário como online.

### Thresholds:
- Online: `lastSeenAt < 90s`
- Idle: `lastSeenAt < 5min`
- Offline: `lastSeenAt > 5min`

### Modelo de dados:
- Campo `lastSeenAt` (DateTime?) adicionado ao modelo `User` no Prisma schema | AUTOR: VIBECODE

## Grupos Básicos + Confirmação de Leitura Opcional (03/07/2026)

### Item 9: Grupos Básicos
Criada API completa para criação e gerenciamento de grupos:

**APIs criadas:**
- `POST /api/groups` — Cria grupo com nome + lista de membros. Usuário logado vira admin.
- `GET /api/groups/[id]` — Retorna detalhes do grupo (requer ser membro)
- `PUT /api/groups/[id]` — Atualiza nome/avatar do grupo (admin only)
- `DELETE /api/groups/[id]` — Deleta grupo (admin only)
- `POST /api/groups/[id]/members` — Adiciona membro (admin only)
- `DELETE /api/groups/[id]/members/[userId]` — Remove membro (admin ou auto-remoção)

**Frontend criado:**
- `src/features/groups/CreateGroupModal.tsx` — Modal de criação de grupo com:
  - Input para nome do grupo
  - Lista de contatos com seleção (checkboxes)
  - Contador de participantes selecionados
  - Botão criar com loading state
- Botão "Criar Grupo" (ícone +) na página `/contacts`

**Service atualizado:**
- `user.service.ts` — Adicionado método `findByIds()` para validar membros

### Item 10: Confirmação de Leitura Opcional

**Schema:**
- Adicionado campo `readReceiptEnabled` (Boolean, default `true`) ao modelo `User`
- Migração: `20260703000001_add_read_receipt_toggle`

**Lógica de leitura:**
- `PATCH /api/messages/[messageId]/status` agora verifica `userProfile.readReceiptEnabled`:
  - Se **true** (padrão): marca como `lida` (blue ticks para o remetente)
  - Se **false**: marca como `recebida` (grey ticks para o remetente)
- O leitor sempre vê a mensagem como lida na sua interface (local state)

**Settings:**
- Toggle "Confirmação de leitura" adicionado na seção Privacidade
- Descrição: "Quando desativado, outras pessoas não verão quando você leu as mensagens delas"
- `PUT /api/profile` agora aceita e retorna `readReceiptEnabled`
- `POST /api/auth/sync` agora retorna `readReceiptEnabled` | AUTOR: VIBECODE

## Schema Batch + Indicador de Digitação + Deduplicação (03/07/2026)

### Schema Batch (preparação para P1)
Adicionados todos os campos/modelos necessários para itens futuros de uma só vez:

**User:**
- `typingIndicatorEnabled` (Boolean, @default(true)) — Item #11

**Message:**
- `clientMessageId` (String?, unique com senderId) — Item #13
- `expiresAt` (DateTime?) — Item #14
- `mimeType`, `fileSize`, `fileName` (String?/Int?/String?) — Item #20

**Conversation:**
- `isEphemeral` (Boolean, @default(false)) — Item #15
- `defaultTTL` (Int?) — Item #15

**Novo modelo: Reaction** (messageId, userId, emoji, createdAt) — Item #19

Migração: `20260703000002_batch_schema_updates` (aplicada via db push + resolve)

### Item 11: Indicador de digitação opcional
**Arquivos criados:**
- `src/hooks/useTypingIndicator.ts` — Hook via Realtime Broadcast:
  - Canal `typing:<conversationId>` com broadcast `self: false`
  - Eventos: `typing_start` (userId + fullName) e `typing_stop` (userId)
  - Debounce de 1s para "stopped_typing", auto-expira em 3s sem evento
  - Respeita `enabled` (toggle do usuário)
- `src/components/TypingIndicator.tsx` — Animação com 3 dots pulsando + "Fulano está digitando..."

**Arquivos modificados:**
- `ChatArea.tsx` — Importa e usa o hook, chama `setTyping(true/false)` no onChange do input, `setTyping(false)` no onBlur, aceita prop `typingIndicatorEnabled`
- `Settings` — Toggle "Indicador de digitação" na seção Privacidade
- `Profile` API — Aceita/retorna `typingIndicatorEnabled`
- `Auth/Sync` API — Retorna `typingIndicatorEnabled`
- `AuthProvider` — Profile interface atualizada com `typingIndicatorEnabled`
- `/chat` page + `/web` page — Passam `typingIndicatorEnabled` para ChatArea

### Item 13: Garantia de entrega + Deduplicação
**Arquivos modificados:**
- `message.service.ts` — Adicionado `findByClientMessageId(senderId, clientMessageId)` para lookup de duplicatas
- `POST /api/messages` — Se `clientMessageId` informado, verifica duplicata e retorna mensagem existente (200 OK, idempotente)
- `ChatArea.tsx` — Gera `clientMessageId` único (`userId-timestamp-counter`), envia no body da requisição
- Botão "Reenviar" em mensagens com status `nao_enviada` (texto vermelho, clicável)
- Retry usa `handleRetry` que reenvia com o mesmo clientMessageId (idempotente)

### Schema Batch (preparação para P1)
Adicionados campos/modelos para itens futuros sem precisar migrar de novo:
- **Message:** `expiresAt`, `mimeType`, `fileSize`, `fileName` — Itens #14 e #20
- **Conversation:** `isEphemeral`, `defaultTTL` — Item #15
- **Reaction:** Novo modelo (messageId, userId, emoji) — Item #19
- Migração: `20260703000002_batch_schema_updates` | AUTOR: VIBECODE

## REQUISITOS P1 COMPLETOS (03/07/2026)
Todos os 8 itens do P1 foram implementados e integrados:

### #14 — Mensagens efêmeras (TTL configurável)
- Worker: `POST /api/expire-messages` — deleta mensagens com expiresAt <= now()
- UI: Seletor TTL no ChatArea (1min, 5min, 30min, 1h, 24h) ao lado do input
- `POST /api/messages` aceita `expiresAt` no body e persiste no banco
- Badge "⏱ Expira em Xmin" nas mensagens efêmeras

### #15 — Modo conversa efêmera
- Worker: `POST /api/expire-conversations` — deleta conversas com isEphemeral + TTL expirado
- `Conversation.isEphemeral` + `defaultTTL` usados pelos círculos

### #16 — Mídia com expiração automática
- Mídias enviadas herdam TTL da mensagem (mesmo campo expiresAt)
- Workers limpam mensagens expiradas (incluindo mídias)

### #17 — Círculos (grupos temporários)
- `CircleService` — CRUD completo sem admin rígido (qualquer membro adiciona/remove)
- API: `GET/POST /api/circles`, `GET/DELETE/PATCH /api/circles/[id]`, `POST /api/circles/[id]/members`
- `CircleBadge.tsx` — Componente visual com timer regressivo + barra de progresso
- `CreateCircleModal.tsx` — Modal de criação com seletor TTL (1h/6h/24h/3d/7d)
- Círculos expiram automaticamente via worker

### #18 — Áudios curtos
- `AudioRecorder.tsx` — Gravação via MediaRecorder com waveform animado + preview + envio
- `AudioMessage.tsx` — Player inline com botão play/pause, waveform, timer
- Botão de áudio no form do ChatArea (alterna entre input text e recorder)

### #19 — Reações rápidas (emoji)
- API: `POST/GET /api/messages/[messageId]/reactions` (toggle: adiciona/remove)
- `ReactionService` — toggle, getReactions (agrupado), getMessagesReactions (contagem)
- `ReactionPicker.tsx` — Popover com 10 emojis ao passar mouse na mensagem
- `MessageReactions.tsx` — Exibição das reações com contagem

### #20 — Mídia em mensagens (imagem, vídeo, áudio, arquivo)
- Upload: `POST /api/upload/message-media` — Supabase Storage bucket `message-media`
- `ImageMessage.tsx` — Imagem com lightbox (clique abre overlay)
- `VideoMessage.tsx` — Player de vídeo com controls
- `AudioMessage.tsx` — Player de áudio com waveform
- `FileMessage.tsx` — Card de arquivo com download
- `POST /api/messages` — Aceita fileUrl/mimeType/fileSize/fileName
- Botão de anexo no form do ChatArea (input file hidden)

### #21 — Sinais "Vibe"
- Schema: `VibeSignal` model + relações em User (`sentVibes`, `receivedVibes`)
- `VibeService` — sendSignal, getPendingSignals, acknowledgeSignal
- API: `POST /api/vibe` (enviar), `GET /api/vibe/pending` (pendentes)
- `VibeButton.tsx` — Botão com popover (Buzz, Poke, Wave, Heartbeat, Fire) + animação emoji voador
- `VibeNotification.tsx` — Toast notification com polling 15s + botão "Retribuir"
- `VibeNotificationWrapper.tsx` — Dynamic import wrapper para server component layout

### Arquivos criados:
```
src/app/api/messages/[messageId]/reactions/route.ts
src/app/api/upload/message-media/route.ts
src/app/api/expire-messages/route.ts
src/app/api/expire-conversations/route.ts
src/app/api/circles/route.ts
src/app/api/circles/[id]/route.ts
src/app/api/circles/[id]/members/route.ts
src/app/api/vibe/route.ts
src/app/api/vibe/pending/route.ts
src/components/media/ImageMessage.tsx
src/components/media/VideoMessage.tsx
src/components/media/AudioMessage.tsx
src/components/media/FileMessage.tsx
src/components/AudioRecorder.tsx
src/components/VibeButton.tsx
src/components/VibeNotification.tsx
src/components/VibeNotificationWrapper.tsx
src/components/ReactionPicker.tsx
src/components/MessageReactions.tsx
src/services/reaction.service.ts
src/services/circle.service.ts
src/services/vibe.service.ts
src/features/groups/CircleBadge.tsx
src/features/groups/CreateCircleModal.tsx
```

### Arquivos modificados:
- `src/features/chat/components/ChatArea.tsx` — Integração de mídia, reações, áudio, TTL, upload
- `src/app/api/messages/route.ts` — Suporte a expiresAt, fileUrl, mimeType, fileSize, fileName
- `src/app/(main)/chat/page.tsx` — VibeButton no header + CircleBadge
- `src/app/(main)/layout.tsx` — VibeNotificationWrapper global
- `src/services/index.ts` — Exporta reactionService, circleService, vibeService
- `prisma/schema.prisma` — Modelo VibeSignal + relações

### Build:
✅ 36 pages + ~31 API routes. Compilado com sucesso. | AUTOR: VIBECODE