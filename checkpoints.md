# Checkpoints

## 02/07/2026 - Corrigido erro de migração do schema (enum MessageStatus)

### Estado atual
- **Branch:** `vibecode`
- **Último commit:** (pendente)

### O que foi feito
- Criada migração manual `20260702000001_add_message_status_enum_and_status_events`
- Convertido coluna `status` de TEXT para `MessageStatus` enum no PostgreSQL com conversão de dados existentes (sent→enviada, received→recebida, read→lida)
- Criada tabela `message_status_events` que estava faltando
- Banco sincronizado com schema Prisma (`prisma db push`)
- Build validado com sucesso
