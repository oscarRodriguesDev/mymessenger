/**
 * Constantes que espelham o enum MessageStatus do Prisma.
 * Usado em componentes client-side (browser) onde @prisma/client não pode ser importado.
 */
export const MessageStatus = {
  nao_enviada: 'nao_enviada' as const,
  enviada: 'enviada' as const,
  recebida: 'recebida' as const,
  lida: 'lida' as const,
} as const;

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
