import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  stringToBase64URL,
  stringFromBase64URL,
  createChunks,
  combineChunks,
  isChunkLike,
  DEFAULT_COOKIE_OPTIONS,
} from '@supabase/ssr';

/**
 * Prefix used by @supabase/ssr para identificar cookies com valor em base64url.
 */
const BASE64_PREFIX = 'base64-';

/**
 * Cria um storage adaptador baseado em cookies compatível com o formato
 * do @supabase/ssr, mas usando flowType: 'implicit' (o createBrowserClient
 * do @supabase/ssr@0.12.0 força flowType: 'pkce' e não permite sobrescrever).
 *
 * Com flowType: 'implicit', o GoTrueClient detecta #access_token= no hash
 * da URL e processa o callback de implicit grant automaticamente.
 */
function createCookieStorage() {
  /**
   * Lê um valor do cookie, lidando com chunking e decodificação base64url.
   */
  const getItem = async (key: string): Promise<string | null> => {
    try {
      const chunked = await combineChunks(key, async (chunkName) => {
        const escapedName = chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = document.cookie.match(
          new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
        );
        if (!match) return null;
        return decodeURIComponent(match[1]);
      });

      if (!chunked) return null;
      if (!chunked.startsWith(BASE64_PREFIX)) return chunked;

      return stringFromBase64URL(chunked.substring(BASE64_PREFIX.length));
    } catch {
      return null;
    }
  };

  /**
   * Define um valor no cookie, aplicando encoding base64url + chunking
   * para compatibilidade com @supabase/ssr.
   */
  const setItem = async (key: string, value: string): Promise<void> => {
    // Remove chunks antigos para este key
    const existingChunks: string[] = [];
    for (let i = 0; ; i++) {
      const name = i === 0 ? key : `${key}.${i}`;
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|; )${escapedName}=`).test(document.cookie)) {
        existingChunks.push(name);
      } else if (i > 0) {
        break;
      }
    }

    // Codificar valor: base64- + base64url(sessionJSON)
    const encoded = BASE64_PREFIX + stringToBase64URL(value);

    // Criar chunks (lida com cookies > 3180 bytes)
    const chunks = createChunks(key, encoded);
    const newChunkNames = new Set(chunks.map((c) => c.name));

    // Remover chunks antigos que não estão mais no conjunto
    for (const name of existingChunks) {
      if (!newChunkNames.has(name)) {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
      }
    }

    // Definir novos chunks
    for (const { name, value: chunkValue } of chunks) {
      document.cookie =
        `${name}=${encodeURIComponent(chunkValue)}; path=/; ` +
        `max-age=${DEFAULT_COOKIE_OPTIONS.maxAge}; SameSite=Lax;`;
    }
  };

  /**
   * Remove todos os chunks de cookie para este key.
   */
  const removeItem = async (key: string): Promise<void> => {
    for (let i = 0; ; i++) {
      const name = i === 0 ? key : `${key}.${i}`;
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|; )${escapedName}=`).test(document.cookie)) {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
      } else if (i > 0) {
        break;
      }
    }
  };

  return { getItem, setItem, removeItem };
}

/**
 * Cria um cliente Supabase para uso no BROWSER.
 *
 * DIFERENTE de createBrowserClient do @supabase/ssr:
 * - Usa flowType: 'implicit' (NÃO pkce) para que o GoTrueClient
 *   detecte #access_token= no hash da URL e processe o login
 *   automaticamente (necessário para o fluxo de QR/web).
 * - Mantém o mesmo formato de cookies (base64- + base64url + chunking)
 *   para compatibilidade com createServerClient do @supabase/ssr.
 *
 * O client é singleton (cached globalmente) igual ao createBrowserClient.
 */
let cachedClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;

  cachedClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storage: createCookieStorage(),
      },
    }
  );

  return cachedClient;
}
