# Checkpoints

## 02/07/2026 - Página de Configurações do Usuário

### Estado atual
- **Branch:** `vibecode`
- **Último commit:** a ser criado

### O que foi feito
**Nova rota:** `/settings` dentro do layout `(main)` (protegida)

**APIs criadas:**
- `PUT /api/profile` — Atualizar dados do perfil (fullName, username, bio, phone, discoverableByPhone, discoverableByUsername)
- `PUT /api/profile/password` — Alterar senha via Supabase Auth (com verificação da senha atual)
- `POST /api/upload` — Upload de avatar para bucket Supabase `photoProfile` com upsert (nome do arquivo: `{userId}.{ext}`)

**Página de Configurações** (`/settings`) com 5 seções:
1. **Perfil** — Nome completo, username, bio
2. **Foto** — Upload de avatar com preview, remover foto
3. **Contato** — Email (leitura), Telefone
4. **Segurança** — Alterar senha (atual + nova + confirmar)
5. **Privacidade** — Toggles: descoberta por telefone / username

**Navigation atualizada:**
- Ícone de engrenagem (⚙️) ao lado do toggle de tema
- Avatar do usuário logado como link para configurações
- Destaque visual quando estiver na página de settings

### Arquivos criados
- `src/app/(main)/settings/page.tsx`
- `src/app/api/profile/route.ts`
- `src/app/api/profile/password/route.ts`
- `src/app/api/upload/route.ts`

### Arquivos modificados
- `src/components/layout/Navigation.tsx` — Adicionado link de settings + avatar do usuário

### Build validado com sucesso ✅
