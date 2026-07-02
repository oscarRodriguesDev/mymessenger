/**
 * Utilitário compartilhado para detectar se o dispositivo é desktop.
 * Usado tanto no servidor (middleware) quanto no cliente (frontend).
 */

/**
 * Detecta se é um desktop baseado no User-Agent (uso server-side)
 */
export function isDesktopFromUA(userAgent: string | null): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  // Keywords mobile/tablet
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'iemobile', 'opera mini', 'webos', 'touch',
  ];

  const isMobileUA = mobileKeywords.some((keyword) => ua.includes(keyword));

  // Se não tem keyword mobile, provavelmente é desktop
  return !isMobileUA;
}

/**
 * Detecta se é desktop baseado em propriedades do navegador (uso client-side)
 */
export function isDesktopFromBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isNarrow = window.innerWidth <= 1024;

  const isMobileDevice = hasTouch || isMobileUA || isNarrow;

  return !isMobileDevice;
}
