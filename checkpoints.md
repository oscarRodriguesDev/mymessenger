# Checkpoints

## 01/07/2026 - Fim de sessão (plano pendente)

### Estado atual
- **Branch:** `main` (com mudanças não staged em `package.json`, `package-lock.json`, `ChatArea.tsx`)
- **Último commit:** `9b4e09d` - "feat: implementar envio otimista e indicadores de status estilo WhatsApp"

### Schema Prisma (`prisma/schema.prisma`)
- Campo `status` em Message: `String @default("sent")` — **ainda sem enum**

### Pendente (plano definido pelo usuário)
O usuário planejou implementar um enum `MessageStatus` no Prisma:

1. **Schema:** Adicionar `enum MessageStatus { nao_enviada enviada recebida lida }` e alterar `status` de `String` para `MessageStatus @default(enviada)`
2. **Migração:** `npx prisma migrate dev --name add_message_status_enum` + `npx prisma generate`
3. **message.service.ts:** Importar `MessageStatus`, tipar métodos com o enum
4. **ChatArea.tsx:** Importar `MessageStatus`, usar enum no lugar de strings
5. **messages/route.ts (POST):** Usar `MessageStatus.enviada`
6. **messages/[messageId]/status/route.ts (PATCH):** Validar e usar enum
7. **Validação:** `npm run build`
