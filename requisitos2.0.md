# Análise: requisitos2.0.md vs Estado Atual do Código

> Data: 03/07/2026
> Projeto: my_Messenger
> Branch: vibecode

---

## Legenda

| Ícone | Significado      |
| ----- | ---------------- |
| ✅    | Implementado     |
| 🔶    | Parcial          |
| ❌    | Não implementado |
| N/A   | Fora do escopo   |

---

## P0 — Núcleo do Sistema (sem isso não existe produto)

| #   | Requisito                                       | Status | Detalhes                                                                                                                      |
| --- | ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Conta por username único                        | ✅     | `User.username` é unique. Registro com username + signUp.                                                                     |
| 2   | Email opcional (recuperação)                    | ✅     | Email usado como login/recuperação via Supabase Auth.                                                                         |
| 3   | Perfil simples (foto, nome)                     | ✅     | `fullName`, `avatarUrl`, `bio`. Página de settings completa com edição.                                                       |
| 4   | Status de presença (online, ausente, invisível) | 🔶     | `lastSeenAt` existe no schema, mas **nunca é atualizado em tempo real**. Sem heartbeat, sem tracking online/offline.          |
| 5   | Sistema seguir/adicionar                        | ✅     | FollowService completo: seguir, aceitar, rejeitar, amigos mútuos, seguidores, seguindo.                                       |
| 6   | Solicitação por username                        | ✅     | `GET /api/users/search?q=` com debounce 300ms. Exibe status do follow.                                                        |
| 7   | Bloqueio e restrição                            | 🔶     | Modelo `BlockedUser` existe. Backend de follow já exclui bloqueados. **Sem endpoint nem frontend para bloquear/desbloquear.** |
| 8   | Conversas 1:1                                   | ✅     | Criação automática ao enviar primeira mensagem.                                                                               |
| 9   | Grupos básicos                                  | 🔶     | `createGroupConversation()` existe no service. **Sem API endpoint nem frontend para criar grupos.**                           |
| 10  | Confirmação de leitura opcional                 | 🔶     | `MessageRead` + ticks funcionam. **Sem toggle por usuário (sempre ativo).**                                                   |
| 11  | Indicador de digitação opcional                 | ❌     | Não implementado.                                                                                                             |
| 12  | Infraestrutura em tempo real (WebSocket)        | ✅     | Supabase Realtime (PostgreSQL LISTEN/NOTIFY).                                                                                 |
| 13  | Garantia de entrega + deduplicação              | ❌     | Sem idempotência por `messageId` no servidor. Sem fila de retry para offline.                                                 |

### Itens P0 — Resumo

- **✅ Completos:** 1, 2, 3, 5, 6, 8, 12
- **🔶 Pendentes:** 4 (presença real-time), 7 (bloqueio UI), 9 (criação de grupos), 10 (toggle leitura)
- **�0s Faltando:** 11 (digitação), 13 (dedup)

---

## P1 — Camada de Comportamento Jovem (diferenciação real)

| #   | Requisito                                 | Status | Detalhes                                                                      |
| --- | ----------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| 14  | Mensagens efêmeras (TTL configurável)     | ❌     | Sem campo `expiresAt` no Message. Sem worker de expiração.                    |
| 15  | Modo conversa efêmera por chat            | ❌     | Sem toggle por conversa.                                                      |
| 16  | Mídia com expiração automática            | ❌     | Sem upload de mídia em mensagens.                                             |
| 17  | Círculos (grupos leves, temporários)      | ❌     | Só grupos tradicionais (permanentes, admin). Sem participação temporária.     |
| 18  | Áudios curtos como padrão                 | ❌     | Sem gravação, upload ou player de áudio.                                      |
| 19  | Reações rápidas (emoji)                   | ❌     | Sem modelo `Reaction` nem UI.                                                 |
| 20  | Resposta com mídia (imagem, áudio, vídeo) | ❌     | Mensagens só aceitam `text`. `fileUrl` existe no schema mas nunca é populado. |
| 21  | Sinais "vibe" (interações não textuais)   | ❌     | Não implementado.                                                             |

### Itens P1 — Resumo

- **✅ Completos:** Nenhum
- **🔶 Pendentes:** Nenhum
- **❌ Faltando:** 14, 15, 16, 17, 18, 19, 20, 21 (tudo)

---

## P2 — Mecanismos de Deslocamento Social

| #   | Requisito                                      | Status | Detalhes                           |
| --- | ---------------------------------------------- | ------ | ---------------------------------- |
| 22  | Espaços por contexto (amigos, escola, privado) | ❌     | Não existe conceito de "espaços".  |
| 23  | Regras de visibilidade por espaço              | ❌     | Não implementado.                  |
| 24  | Entrada por convite                            | ❌     | Sem sistema de convites.           |
| 25  | Descoberta pública limitada                    | ❌     | Só busca de usuários por username. |
| 26  | Eventos leves (encontros rápidos)              | ❌     | Não implementado.                  |

### Itens P2 — Resumo

- **✅ Completos:** Nenhum
- **🔶 Pendentes:** Nenhum
- **❌ Faltando:** 22, 23, 24, 25, 26 (tudo)

---

## P3 — Camada de Engajamento

| #   | Requisito                                        | Status | Detalhes                                             |
| --- | ------------------------------------------------ | ------ | ---------------------------------------------------- |
| 27  | Status temporário (stories)                      | ❌     | Sem modelo, sem upload temporário, sem visualização. |
| 28  | Presença ativa (quem está online nos círculos)   | ❌     | Sem heartbeat, sem indicador visual de online.       |
| 29  | "Join agora" (entrar em conversas em tempo real) | ❌     | Não implementado.                                    |

### Itens P3 — Resumo

- **✅ Completos:** Nenhum
- **🔶 Pendentes:** Nenhum
- **❌ Faltando:** 27, 28, 29 (tudo)

---

## Arquitetura (MVP Escalável)

| #   | Requisito                                 | Status       | Detalhes                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30  | Mobile-first (React Native / Flutter)     | ✅ (WebView) | Já existe um aplicativo nativo que instancia uma WebView carregando a URL da aplicação Next.js. Não há planos confirmados de migrar para React Native/Flutter nativo puro — isso só aconteceria se surgir necessidade futura. O MVP segue com esta arquitetura híbrida. |
| 31  | Web como secundário                       | ✅           | QR code + WebSession com restrições de desktop. O app nativo usa WebView, então mobile-first é contemplado pela própria aplicação Next.js ser responsiva.                                                                                                               |
| 32  | Cache local de mensagens (SQLite / Realm) | ❌           | Sem cache local. Sempre busca do servidor.                                                                                                                                                                                                                              |
| 33  | Cliente WebSocket para tempo real         | ✅           | Supabase Realtime.                                                                                                                                                                                                                                                      |
| 34  | UI otimista                               | ✅           | Mensagens aparecem antes da confirmação do servidor.                                                                                                                                                                                                                    |
| 35  | API REST                                  | ✅           | Rotas para auth, usuários, social graph, mensagens.                                                                                                                                                                                                                     |
| 36  | PostgreSQL                                | ✅           | Schema completo com Prisma ORM.                                                                                                                                                                                                                                         |
| 37  | Redis (cache, presença, pub/sub)          | ❌           | Não implementado. Usamos PostgreSQL + Realtime.                                                                                                                                                                                                                         |
| 38  | S3 / CDN para mídia                       | 🔶           | Só bucket `photoProfile` para avatares. Sem storage geral.                                                                                                                                                                                                              |

---

## 📋 Plano de Implementação Recomendado

### Fase 1 — Completar P0 (base sólida)

| Ordem | Item                                                                                              | Esforço |
| ----- | ------------------------------------------------------------------------------------------------- | ------- |
| 1     | **Presença em tempo real** — heartbeat + indicador online/offline + lastSeenAt automático         | Médio   |
| 2     | **Endpoint de criação de grupos** + frontend (criar grupo, listar membros)                        | Médio   |
| 3     | **Bloqueio de usuários** — endpoint POST/DELETE + UI nos contatos                                 | Pequeno |
| 4     | **Indicador de digitação** — canal Realtime + exibição "fulano está digitando"                    | Médio   |
| 5     | **Toggle de confirmação de leitura** — campo `readReceiptsEnabled` no User + respeitar no backend | Pequeno |
| 6     | **Deduplicação de mensagens** — client-side messageId + idempotência 409 no servidor              | Pequeno |

### Fase 2 — Diferenciação (P1)

| Ordem | Item                                                                                              | Esforço |
| ----- | ------------------------------------------------------------------------------------------------- | ------- |
| 7     | **Upload de mídia em mensagens** — bucket `message-media` + aceitar fileUrl no POST /api/messages | Médio   |
| 8     | **Mensagens efêmeras** — campo `expiresAt` + worker de expiração + UI de TTL                      | Grande  |
| 9     | **Reações com emoji** — modelo Reaction + toggle na mensagem                                      | Médio   |
| 10    | **Áudio** — gravação (MediaRecorder) + upload + player                                            | Grande  |
| 11    | **Círculos** — grupos com participação temporária e sem admin rígido                              | Grande  |

### Fase 3 — Engajamento (P2/P3)

| Ordem | Item                                                                    | Esforço      |
| ----- | ----------------------------------------------------------------------- | ------------ |
| 12    | **Status temporário (stories)** — upload + expiração 24h + visualização | Grande       |
| 13    | **Espaços por contexto** — separação amigos/escola/privado              | Muito Grande |
| 14    | **Eventos leves** — criação + confirmação + chat expirável              | Grande       |
| 15    | **Presença ativa + join agora**                                         | Médio        |

---
