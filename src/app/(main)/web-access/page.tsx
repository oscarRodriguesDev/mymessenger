'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type QrStatus = 'loading' | 'pending' | 'confirmed' | 'expired' | 'error';

export default function WebAccessPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('loading');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─────────────────────────────────────────────────────────────
  // Criar nova sessão QR
  // ─────────────────────────────────────────────────────────────
  const createSession = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/qr/create', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Erro ao criar QR code');
        return;
      }

      setToken(data.token);
      setQrDataUrl(data.qrDataUrl);
      setExpiresAt(data.expiresAt);
      setStatus('pending');
    } catch {
      setStatus('error');
      setErrorMsg('Erro de conexão com o servidor');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Iniciar polling quando token estiver disponível
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || status !== 'pending') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/qr/status/${token}`);
        const data = await res.json();

        if (data.status === 'confirmed') {
          setStatus('confirmed');
          if (pollingRef.current) clearInterval(pollingRef.current);

          // Trocar o token por um link de login
          try {
            const exchangeRes = await fetch('/api/qr/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const exchangeData = await exchangeRes.json();

            if (exchangeRes.ok && exchangeData.redirectTo) {
              // Redirecionar para a página da aplicação web
              // (a sessão já foi configurada nos cookies pelo servidor)
              window.location.href = exchangeData.redirectTo;
            } else {
              setErrorMsg('Erro ao finalizar login. Tente novamente.');
              setStatus('error');
            }
          } catch {
            setErrorMsg('Erro ao finalizar login');
            setStatus('error');
          }
        } else if (data.status === 'expired') {
          setStatus('expired');
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      } catch {
        // Erro de rede - tentar de novo
      }
    }, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, status, router]);

  // ─────────────────────────────────────────────────────────────
  // Countdown regressivo
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'pending') return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // QR expirou
          setStatus('expired');
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status]);

  // ─────────────────────────────────────────────────────────────
  // Iniciar na montagem
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    createSession();
  }, [createSession]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 text-center">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Messenger Web</h1>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR code com o aplicativo do seu celular
          </p>
        </div>

        {/* Área do QR */}
        <div className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-border bg-card">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {status === 'pending' && qrDataUrl && (
            <>
              <div className="rounded-2xl border-4 border-white bg-white p-3 shadow-2xl">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="h-64 w-64"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                QR code expira em{' '}
                <span className="font-mono text-foreground">
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </span>
              </p>
            </>
          )}

          {status === 'confirmed' && (
            <div className="flex h-72 w-72 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">Conectado!</p>
                <p className="text-sm text-muted-foreground">Redirecionando...</p>
              </div>
            </div>
          )}

          {(status === 'expired' || status === 'error') && (
            <div className="flex h-72 w-72 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {status === 'expired' ? 'QR code expirou' : 'Erro'}
                </p>
                {errorMsg && (
                  <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
                )}
              </div>
              <button
                onClick={createSession}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Gerar novo QR code
              </button>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="space-y-3 text-left">
          <h2 className="text-sm font-semibold text-foreground">Como conectar</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
              No seu celular, toque no botão <span className="font-medium text-foreground">Escanear QR Code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
              Aponte a câmera para o QR Code acima
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
              A conexão será confirmada automaticamente
            </li>
          </ol>
          
          {/* Botão para acessar scanner mobile */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Ou acesse diretamente no celular:
            </p>
            <a
              href="/scan-qr"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Abrir scanner no celular
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
