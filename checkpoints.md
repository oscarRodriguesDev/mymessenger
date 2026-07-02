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

## 02/07/2026 - Corrigido trigger e nomes de colunas no Realtime

[Histórico anterior mantido]