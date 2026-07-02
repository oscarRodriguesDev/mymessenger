'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [status, setStatus] = useState<'checking' | 'authenticating' | 'confirming' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  // ─────────────────────────────────────────────────────────────
  // Fluxo: verifica auth → confirma token → redireciona
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link inválido: token não encontrado');
      return;
    }

    // Se não estiver logado, redireciona para login
    if (!user) {
      setStatus('authenticating');
      const loginUrl = `/login?redirect=${encodeURIComponent(`/scan?token=${token}`)}`;
      // Pequeno delay para mostrar mensagem antes de redirecionar
      const t = setTimeout(() => router.push(loginUrl), 1500);
      return () => clearTimeout(t);
    }

    // Se está logado, mas profile ainda carregando
    if (!profile) {
      setStatus('checking');
      return;
    }

    // Confirmar o QR code
    setStatus('confirming');
    setMessage('Confirmando QR code...');

    fetch('/api/qr/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage('QR code confirmado! Volte ao computador.');
          // Redirecionar para o chat após 3 segundos
          setTimeout(() => router.push('/chat'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Erro ao confirmar QR code');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro de conexão com o servidor');
      });
  }, [token, user, profile, router]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Ícone */}
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            status === 'success'
              ? 'bg-primary text-white'
              : status === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {status === 'success' ? (
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : status === 'error' ? (
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>

        {/* Título e mensagem */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {status === 'checking' && 'Verificando...'}
            {status === 'authenticating' && 'Faça login primeiro'}
            {status === 'confirming' && 'Conectando...'}
            {status === 'success' && 'Conectado! 🎉'}
            {status === 'error' && 'Ops!'}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Botão de voltar em caso de erro */}
        {status === 'error' && (
          <button
            onClick={() => router.push('/chat')}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            Voltar ao Messenger
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
