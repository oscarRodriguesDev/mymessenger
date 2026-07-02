import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto:
     * - _next/static (arquivos estáticos do Next.js)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - manifest.json
     * - sw.js (service worker)
     * - Mas AGORA inclui /api/* para bloqueio de desktop
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)',
  ],
};
