# Checkpoints

## 02/07/2026 - Messenger Web via QR Code (WhatsApp Web)

### Estado atual
- **Branch:** `vibecode`
- **Último commit:** `ae139a6` - "fix: mover bloqueio desktop para o cliente + permitir rotas QR"
- **Build:** ✅ Validado com sucesso

### Funcionalidade implementada

**Messenger Web** — Acesso ao messenger em desktop via QR code, igual ao WhatsApp Web.

### Arquitetura

| Camada | Responsabilidade |
|---|---|
| **Backend (Middleware)** | Bloqueia APIs no desktop, exceto `/api/qr/*` |
| **Frontend (DesktopRestriction)** | Bloqueia páginas no desktop, exceto `/web-access`, `/scan`, `/desktop-restricted` |
| **Banco de Dados** | Modelo `QrAuthSession` gerencia sessões QR com expiração de 2 minutos |

### Fluxo completo

```
1. Desktop → /web-access
2. API gera QR code com token único
3. Desktop exibe QR e faz polling (2s)
4. Mobile → escaneia QR (câmera nativa)
5. Mobile → /scan?token=XXX (auto-confirma se logado)
6. Desktop → detecta "confirmed" via polling
7. Desktop → troca token por magic link (/api/qr/exchange)
8. Magic link → completa auth Supabase
9. Desktop → redireciona para /chat (logado)
```

### APIs criadas

| Rota | Método | Descrição |
|---|---|---|
| `/api/qr/create` | POST | Gera token + QR code (data URL) |
| `/api/qr/status/[token]` | GET | Polling do status (pending/confirmed/expired) |
| `/api/qr/confirm` | POST | Mobile confirma scan (requer auth) |
| `/api/qr/exchange` | POST | Desktop troca por magic link |

### Páginas criadas

| Página | Descrição |
|---|---|
| `/web-access` | Desktop exibe QR code + instruções |
| `/scan` | Mobile auto-confirma ao abrir link do QR |
| `/desktop-restricted` | Atualizada com link para `/web-access` |

### Segurança

- QR code expira em **2 minutos**
- Token único de 48 caracteres hex
- Sessão só pode ser confirmada por usuário autenticado
- Magic link gerado via Admin API (não envia email)
- Sessão marcada como `expired` após uso único

### Arquivos envolvidos

```
Criados:
  - prisma/schema.prisma (modelo QrAuthSession)
  - src/services/qr-auth.service.ts
  - src/app/api/qr/create/route.ts
  - src/app/api/qr/status/[token]/route.ts
  - src/app/api/qr/confirm/route.ts
  - src/app/api/qr/exchange/route.ts
  - src/app/(main)/web-access/page.tsx
  - src/app/(main)/scan/page.tsx

Modificados:
  - src/lib/supabase/middleware.ts
  - src/components/DesktopRestriction.tsx
  - src/app/(main)/desktop-restricted/page.tsx
  - src/services/index.ts
  - package.json (qrcode, @types/qrcode)
```

### Como testar

1. **Desktop:** `http://localhost:3000/web-access`
2. **Mobile:** Escaneie o QR code com a câmera
3. **Desktop:** Aguarde confirmação (~2-5 segundos)
4. **Desktop:** Redireciona automaticamente para `/chat`

---

## 02/07/2026 - Página de Configurações do Usuário

### Estado anterior
- **Branch:** `vibecode`
- **Commit:** `daa0722`

### O que foi feito
- Criada página `/settings` com 5 seções (Perfil, Foto, Contato, Segurança, Privacidade)
- APIs de atualização de perfil e senha
- Upload de avatar para bucket Supabase `photoProfile`
- Navegação atualizada com link de configurações

[Ver commit `daa0722` para detalhes]

---

## 03/07/2026 - Aplicação Web Restrita (/web) + Sessão de 7 dias

### O que foi feito

**Nova página `/web`** — Aplicação web restrita para desktop (estilo WhatsApp Web):
- Apenas envio e recebimento de mensagens (sem contatos, configurações ou perfil)
- Layout desktop otimizado com dois painéis (lista de conversas + chat)
- Botão "Sair" que encerra a sessão web e desloga do Supabase
- Exclusiva para desktop (mobile redirecionado para /chat)

**Sessão web de 7 dias:**
- Criado modelo `WebSession` no Prisma com `expiresAt` (7 dias)
- Criado `web-session.service.ts` para CRUD de sessões web
- Sessão é criada no momento do QR exchange (quando usuário escaneia o QR)
- Sessões expiradas são deletadas automaticamente ao verificar
- Força o usuário a re-escanear o QR após 7 dias

**Redirecionamento do magic link:**
- QR exchange agora redireciona para `/web` em vez de `/chat`
- WebSession é criada junto com o magic link

**Middleware atualizado:**
- Desktop + não logado → `/web-access`
- Desktop + logado → permite `/web` e demais rotas protegidas
- `/web` bloqueado para mobile (redireciona para `/chat` ou `/login`)
- APIs `/api/web/*` liberadas no desktop (além de `/api/qr/*`)
- Rota raiz (`/`) redireciona: desktop → `/web` ou `/web-access`, mobile → `/chat` ou `/login`

**DesktopRestriction atualizado:**
- Rota `/web` adicionada às rotas permitidas no desktop
- `/web` não é bloqueada independente do dispositivo

### Arquivos criados
- `prisma/schema.prisma` (modelo WebSession + relação em User)
- `src/services/web-session.service.ts`
- `src/app/(web)/layout.tsx`
- `src/app/(web)/web/page.tsx`
- `src/app/api/web/session/route.ts`

### Arquivos modificados
- `src/app/api/qr/exchange/route.ts` (redirectTo → /web + cria WebSession)
- `src/lib/supabase/middleware.ts` (regras de desktop + /web)
- `src/components/DesktopRestriction.tsx` (permitir /web)
- `src/services/index.ts` (exportar webSessionService)

### Estado do build
- ✅ Build validado com sucesso

---

## 03/07/2026 - CORREÇÃO: Middleware bloqueava APIs no desktop após login QR

### Problema
Após escanear o QR code, o exchange retornava 200 com `redirectTo: /web#access_token=xxx`, mas o navegador redirecionava de volta para `/web-access`. Loop infinito.

### Causa raiz
O middleware `middleware.ts` bloqueava TODAS as APIs no desktop, exceto `/api/qr/*` e `/api/web/*`:

```javascript
if (isDesktop && !isAllowedApi) {
    return NextResponse.json({ error: '...' }, { status: 403 });
}
```

Quando o `syncProfile()` (chamado pelo `AuthProvider` após processar o hash do magic link) fazia `POST /api/auth/sync`, o middleware retornava **403 Forbidden** porque `/api/auth/` não estava na whitelist.

Com `profile = null` (nunca setado porque o sync falhou), a página `/web` executava:
```javascript
if (!user || !profile) {
    router.replace('/web-access');
    return;
}
```

redirecionando de volta para o QR code.

### Correção
Adicionada verificação de autenticação no middleware:
- Desktop **autenticado** (já passou pelo fluxo QR) → **permite** qualquer API
- Desktop **não autenticado** → mantém bloqueio (403)

```javascript
if (isDesktop && !isAllowedApi) {
    if (user) {  // <-- NOVO: desktop autenticado permite APIs
        return response;
    }
    return NextResponse.json({ error: '...' }, { status: 403 });
}
```

### Arquivo modificado
- `src/lib/supabase/middleware.ts`

### Impacto
- `/api/auth/sync` → agora funciona (syncProfile)
- `/api/conversations` → agora funciona (carregar conversas)
- `/api/messages` → agora funciona (ChatArea)
- Demais APIs do chat → todas funcionam para desktop autenticado

### Estado do build
- ✅ Build validado com sucesso

---

## 03/07/2026 - Corrigido leitor de QR code (/scan-qr)

### Problemas identificados
1. **Permissão de câmera não aparecia:** `startScanner()` era chamado automaticamente no `useEffect` ao montar o componente, sem gesto do usuário. Navegadores modernos bloqueiam `getUserMedia` sem interação do usuário.
2. **Erro "Element not found":** O `Html5Qrcode` lança exceção se o elemento `#qr-reader` não existir no DOM. O div era renderizado condicionalmente (`{scanning && <div id="qr-reader">}`), mas a state update assíncrona do React não tinha processado a renderização antes do construtor tentar encontrá-lo.

### O que foi feito
- **Scanner inicia apenas por clique do usuário** — removido `startScanner()` do `useEffect` de montagem. O usuário precisa clicar "Iniciar câmera" para acionar a câmera, garantindo que `getUserMedia` seja chamado a partir de um gesto do usuário.
- **Div #qr-reader sempre no DOM** — agora o elemento está sempre presente (com `hidden` quando não escaneando), eliminando o erro `"HTML Element with id=qr-reader not found"`.
- **Verificação de câmera disponível** — `Html5Qrcode.getCameras()` é chamado na montagem para detectar se há câmera antes de exibir o botão.
- **QR box responsivo** — usa função que retorna 80% do menor lado do viewfinder (adaptável a diferentes tamanhos de tela).
- **FPS aumentado para 15** — mais quadros por segundo = detecção mais rápida e confiável.
- **Tratamento de erros específico** — mensagens diferentes para Permission, NotFoundError e erros genéricos.

### Arquivo modificado
- `src/app/(main)/scan-qr/page.tsx`

### Estado do build
- ✅ Build validado com sucesso

---

## 02/07/2026 - Corrigido trigger e nomes de colunas no Realtime

[Histórico anterior mantido]

---

## 03/07/2026 - Schema Batch + Indicador de Digitação + Deduplicação

### Schema Batch (migração única para P0+P1)
Adicionados TODOS os campos/modelos futuros em uma única migração:

| Modelo | Campos novos | Itens |
|---|---|---|
| User | `typingIndicatorEnabled` (Boolean) | #11 |
| Message | `clientMessageId` (String?, unique), `expiresAt`, `mimeType`, `fileSize`, `fileName` | #13, #14, #20 |
| Conversation | `isEphemeral`, `defaultTTL` (Int?) | #15 |
| **Novo: Reaction** | messageId, userId, emoji | #19 |

### Item 11: Indicador de digitação

**Arquitetura:** Supabase Realtime Broadcast (ephemeral, sem escrever no banco).

**Funcionamento:**
1. ChatArea chama `setTyping(true)` no onChange do input
2. `useTypingIndicator` hook envia broadcast `typing_start` com `{ userId, fullName }` no canal `typing:<convId>`
3. Outros usuários na conversa recebem e veem "Fulano está digitando..."
4. Debounce de 1s: se parar de digitar, envia `typing_stop`
5. Auto-expira 3s: se não receber novo `typing_start`, remove da lista
6. Toggle em Settings > Privacidade controla ENVIO (não recebimento)
7. Animação: 3 dots pulsando + texto italic

**Arquivos:**
- `useTypingIndicator.ts` (hook)
- `TypingIndicator.tsx` (componente)
- ChatArea, Settings, Profile API, Auth/Sync API, AuthProvider, /chat, /web

### Item 13: Deduplicação

**Funcionamento:**
1. ChatArea gera `clientMessageId` único: `${userId}-${Date.now()}-${counter}`
2. Envia no body do POST /api/messages
3. Servidor verifica `findByClientMessageId(senderId, clientMessageId)`:
   - Se existente → retorna 200 com a mensagem existente (idempotente)
   - Se novo → cria normalmente
4. Mensagens que falham (`nao_enviada`) mostram botão "Reenviar"
5. Retry reenvia com mesmo `clientMessageId` (garantia de não duplicar)

**Arquivos:**
- message.service.ts (+findByClientMessageId)
- POST /api/messages (verificação + criação com clientMessageId)
- ChatArea.tsx (geração, envio, retry)

### Estado P0 atual
- ✅ 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13
- 🔶 7 (Bloqueio — modelo existe, falta API + UI)

### Estado do build
- ✅ Build validado com sucesso (32 pages + middleware + 21 API routes)

### O que foi feito

**Item 9 — Grupos Básicos:** API completa + frontend para criar e gerenciar grupos de conversa.

**Item 10 — Confirmação de Leitura Opcional:** Toggle por usuário para controlar envio de read receipts.

### APIs criadas

| Rota | Método | Descrição |
|---|---|---|
| `/api/groups` | POST | Cria grupo com nome + lista de membros |
| `/api/groups/[id]` | GET | Detalhes do grupo |
| `/api/groups/[id]` | PUT | Atualiza nome/avatar (admin only) |
| `/api/groups/[id]` | DELETE | Deleta grupo (admin only) |
| `/api/groups/[id]/members` | POST | Adiciona membro (admin only) |
| `/api/groups/[id]/members/[userId]` | DELETE | Remove membro (admin ou auto) |

### Frontend criado

- `src/features/groups/CreateGroupModal.tsx` — Modal de criação de grupo
- Botão "Criar Grupo" na página `/contacts`
- Toggle "Confirmação de leitura" na seção Privacidade do `/settings`

### Schema alterado

- Adicionado `readReceiptEnabled` (Boolean, default `true`) ao modelo `User`
- Migração: `20260703000001_add_read_receipt_toggle`

### Lógica de read receipt

- `PATCH /api/messages/[messageId]/status` verifica a preferência do usuário:
  - `true` → marca como `lida` (blue ticks para o remetente)
  - `false` → marca como `recebida` (grey ticks para o remetente)
- O leitor localmente sempre vê como lida (UX não muda)
- Settings → Privacidade: toggle para ativar/desativar

### Arquivos criados/modificados

```
Criados:
  - src/app/api/groups/route.ts
  - src/app/api/groups/[id]/route.ts
  - src/app/api/groups/[id]/members/route.ts
  - src/app/api/groups/[id]/members/[userId]/route.ts
  - src/features/groups/CreateGroupModal.tsx
  - prisma/migrations/20260703000001_add_read_receipt_toggle/migration.sql

Modificados:
  - prisma/schema.prisma (readReceiptEnabled field)
  - src/services/user.service.ts (findByIds)
  - src/app/api/messages/[messageId]/status/route.ts (read receipt check)
  - src/app/api/profile/route.ts (readReceiptEnabled in/out)
  - src/app/api/auth/sync/route.ts (readReceiptEnabled in response)
  - src/app/(main)/settings/page.tsx (toggle + save)
  - src/app/(main)/contacts/page.tsx (create group button + modal)
```

### Estado do build
- ✅ Build validado com sucesso (32 pages + middleware + 21 API routes)

---

## 03/07/2026 - Sistema de Presença (Online/Offline)

### O que foi feito

**Sistema de presença em tempo real** para mostrar quais contatos estão online, similar ao WhatsApp Web:

### Arquitetura (3 mecanismos combinados)

| Mecanismo | Latência | Propósito |
|---|---|---|
| **Realtime Presence (Supabase)** | Instantâneo | Detectar join/leave em tempo real via WebSocket |
| **Heartbeat REST (30s)** | ~30s | Persistir `lastSeenAt` no banco de dados |
| **Polling de fallback (30s)** | ~30s | Consultar status de usuários específicos quando Realtime não está disponível |

### Componentes criados

- `src/app/api/presence/heartbeat/route.ts` — POST: atualiza `lastSeenAt` do usuário autenticado
- `src/app/api/presence/status/route.ts` — GET: retorna status (online/idle/offline) para lista de userIds
- `src/hooks/usePresence.ts` — Hook React que gerencia os 3 mecanismos + limpeza automática
- `src/components/OnlineIndicator.tsx` — Bolinha verde/amarela/cinza com tooltip

### Componentes modificados

- `src/components/ui/avatar.tsx` — Adicionadas props `showStatus` e `status` para exibir indicador no canto
- `src/features/chat/components/Sidebar.tsx` — Status nos avatares da lista de conversas
- `src/app/(main)/chat/page.tsx` — Header: "Online"/"Offline" abaixo do nome + bolinha no avatar; Lista: status nos avatares
- `src/app/(web)/web/page.tsx` — Mesmas melhorias que /chat; footer mostra próprio usuário como online
- `prisma/schema.prisma` — Campo `lastSeenAt` adicionado ao modelo `User`

### Thresholds de status
- **Online:** `lastSeenAt < 90s`
- **Idle:** `lastSeenAt < 5min`
- **Offline:** `lastSeenAt > 5min`

### Estado do build
- ✅ Build validado com sucesso (29 pages + middleware + 17 API routes)

---

## 03/07/2026 - TODOS OS REQUISITOS P1 IMPLEMENTADOS 🎉

### O que foi feito

Todos os **8 requisitos P1** (camada de diferenciação) foram implementados e integrados:

| # | Requisito | Status | Destaque |
|---|---|---|---|
| 14 | Mensagens efêmeras (TTL) | ✅ | Worker + seletor TTL no envio (1min-24h) |
| 15 | Conversas efêmeras | ✅ | Worker de expiração + isEphemeral/defaultTTL |
| 16 | Mídia com expiração | ✅ | TTL aplicado a mídias via expiresAt |
| 17 | Círculos | ✅ | API completa + CircleBadge + CreateCircleModal |
| 18 | Áudios curtos | ✅ | AudioRecorder + AudioMessage player |
| 19 | Reações emoji | ✅ | API + ReactionPicker + MessageReactions |
| 20 | Mídia em mensagens | ✅ | Image/Video/Audio/FileMessage + upload |
| 21 | Sinais "vibe" | ✅ | VibeButton + VibeNotification + API |

### Principais arquivos criados (~25 novos)

- **APIs:** reactions, circles (CRUD + members), vibe, vibe/pending, expire-messages, expire-conversations, message-media upload
- **Componentes:** ImageMessage, VideoMessage, AudioMessage, FileMessage, AudioRecorder, VibeButton, VibeNotification, ReactionPicker, MessageReactions, CircleBadge, CreateCircleModal
- **Services:** reaction.service, circle.service, vibe.service

### Arquivos modificados
- `ChatArea.tsx` — Integração completa de mídia, reações, áudio, TTL, upload
- `messages/route.ts` — Suporte a expiresAt + fileUrl + mimeType/fileSize/fileName
- `chat/page.tsx` — VibeButton no header + CircleBadge
- `layout.tsx` — VibeNotificationWrapper global
- `services/index.ts` — Novos exports
- `prisma/schema.prisma` — Modelo VibeSignal

### Estado do build
- ✅ 36 pages + ~31 API routes
- ✅ Compilado com sucesso
- ✅ TypeScript check passou

---

## 03/07/2026 - Correções finais pré-MVP

### Alterações realizadas
1. **Vibe removido do header** do chat (`chat/page.tsx`) — agora só existe no menu do clipe
2. **AudioRecorder simplificado** — sem bloqueio preventivo, botão sempre disponível, erro temporário de 2s se falhar
3. **Fallback de mimeType** para WebView (`audio/webm` → `audio/ogg` → `audio/mp4` → `audio/mpeg`)

### Pendências para 04/07/2026
1. **🔴 Áudio — envio não finaliza** (funciona no browser mas não completa o send)
2. **🔴 Áudio — não funciona no celular** (analisar app React Native WebView)
3. **🔴 Bloqueadores**:
   - `npm run dev` restart para limpar cache do VibeService
   - Executar `supabase/storage_policies.sql` no Supabase Dashboard (upload de mídia)

---

## 04/07/2026 - Correção envio de áudio (Next.js) + Permissões React Native

### O que foi feito

**React Native (usuário):**
- Correção em `components/webview-screen.tsx`:
  - `onPermissionRequest` (Android, linha 168): intercepta requisições de permissão do JS (getUserMedia) e concede automaticamente
  - `mediaCapturePermissionGrantType="grant"` (iOS, linha 169): concede permissões de mídia no WKWebView sem prompt nativo
  - JS pre-warmer (linhas 111-120): chama `getUserMedia({ audio: true })` ao carregar para aquecer o pipeline

**Next.js (VIBECODE):**
- **API upload:** Adicionados mimeTypes `audio/webm;codecs=opus`, `audio/mp4`, `audio/mpeg`, `audio/x-m4a` + normalização que remove codecs para match flexível
- **ChatArea.handleAudioSend:** Agora lança erro quando upload/POST falha (antes engolia e retornava sucesso). Adicionado `audioError` state com feedback visual vermelho
- **AudioRecorder.handleSend:** Captura erro e **mantém preview** (não limpa estado) para permitir reenvio
- **Arquivos:** `message-media/route.ts`, `ChatArea.tsx`, `AudioRecorder.tsx`

### Pendências atualizadas
1. ✅ Áudio — envio não finalizava → **CORRIGIDO** (mimeTypes + propagação de erros)
2. ✅ Áudio — não funcionava no celular → **CORRIGIDO** (permissões React Native)
3. 🔴 Bloqueador: Executar `supabase/storage_policies.sql` no Supabase Dashboard

### Branch
- `vibecode` — sem novos commits (aguardando autorização do usuário)