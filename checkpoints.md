# Checkpoints

## 02/07/2026 - Corrigido trigger e nomes de colunas no Realtime

### Estado atual
- **Branch:** `vibecode`
- **Último commit:** `2c0b7c8` - "fix: migracao manual para sincronizar enum MessageStatus..."

### Problema resolvido
A trigger `trg_message_status_change` usava nomes de colunas em snake_case (`message_id`, `conversation_id`), mas a tabela `message_status_events` foi criada com camelCase (`messageId`, `conversationId`). Isso fazia a trigger falhar ao inserir o evento de status, causando erro 500 em `PATCH /api/messages/[messageId]/status`.

### O que foi feito
- Recriada trigger e função com nomes de colunas corretos (camelCase)
- Corrigidos filtros do Realtime no ChatArea.tsx para camelCase
- Criada migração `20260702000002_fix_trigger_column_names`
- Build validado com sucesso

### Fluxo de status esperado
1. `nao_enviada` (⏳ relógio) → mensagem otimista no frontend
2. `enviada` (✓ 1 tick cinza) → mensagem persistiu no banco
3. `recebida` (✓✓ 2 ticks cinza) → mensagem chegou no dispositivo do destinatário
4. `lida` (✓✓ 2 ticks azuis) → destinatário leu a mensagem
