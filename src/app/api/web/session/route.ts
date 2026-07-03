import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { webSessionService } from '@/services';

/**
 * GET /api/web/session
 * Verifica se o usuário atual tem uma sessão web válida.
 * Se não tiver, retorna { valid: false }
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ valid: false, reason: 'not_authenticated' });
    }

    // Verificar se tem sessão web válida
    const session = await webSessionService.findActiveByAuthId(user.id);

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'no_web_session' });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Web session check error:', error);
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 });
  }
}

/**
 * DELETE /api/web/session
 * Encerra APENAS a sessão web do usuário atual (logout web).
 * NÃO desloga do Supabase — isso é feito no cliente com scope:'local'.
 * Assim o celular continua logado normalmente.
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Remove APENAS a sessão web do banco — não revoga o token Supabase
      await webSessionService.deleteByAuthId(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web session delete error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
