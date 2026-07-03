'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/providers/AuthProvider';

export default function ScanQRPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [manualToken, setManualToken] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // ─────────────────────────────────────────────────────────────
  // Verificar disponibilidade de câmera ao montar
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cameras) => {
        setCameraAvailable(cameras && cameras.length > 0);
      })
      .catch(() => {
        setCameraAvailable(false);
      });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Redirecionar se não estiver logado
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/scan-qr')}`);
    }
  }, [user, router]);

  // ─────────────────────────────────────────────────────────────
  // Cleanup ao desmontar (para o scanner se estiver rodando)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Sucesso ao escanear
  // ─────────────────────────────────────────────────────────────
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    try {
      await stopScanner();

      // Extrair token da URL ou usar o texto diretamente
      let token = decodedText;

      if (decodedText.includes('token=')) {
        const url = new URL(decodedText);
        token = url.searchParams.get('token') || decodedText;
      }

      router.push(`/scan?token=${token}`);
    } catch (err) {
      setError('Erro ao processar QR Code. Tente novamente.');
      console.error(err);
    }
  }, [router]);

  // ─────────────────────────────────────────────────────────────
  // Erro ao escanear (ignora erros comuns de leitura)
  // ─────────────────────────────────────────────────────────────
  const handleScanError = useCallback((errorMessage: string) => {
    if (
      errorMessage.includes('NotFoundException') ||
      errorMessage.includes('No code has been found')
    ) {
      return;
    }
    console.log('QR Scan error:', errorMessage);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Iniciar scanner (chamado APENAS por clique do usuário)
  // ─────────────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setError(null);
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      // ── Configurações otimizadas para leitura ──
      const config = {
        fps: 15,                           // mais quadros = detecção mais rápida
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // qrbox responsivo: 80% do menor lado do viewfinder
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: minEdge * 0.8,
            height: minEdge * 0.8,
          };
        },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Preferir câmera traseira
      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        handleScanSuccess,
        handleScanError
      );
    } catch (err: any) {
      console.error('Erro ao iniciar scanner:', err);

      const errorStr = err?.toString() ?? err?.message ?? '';

      if (
        errorStr.includes('NotAllowedError') ||
        errorStr.includes('Permission') ||
        errorStr.includes('permission')
      ) {
        setError(
          'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador e tente novamente.'
        );
      } else if (
        errorStr.includes('NotFoundError') ||
        errorStr.includes('NotFound')
      ) {
        setError('Câmera não encontrada. Verifique se o dispositivo possui câmera.');
      } else {
        setError('Erro ao iniciar câmera. Verifique as permissões e tente novamente.');
      }

      setScanning(false);
    }
  }, [handleScanSuccess, handleScanError]);

  // ─────────────────────────────────────────────────────────────
  // Parar scanner
  // ─────────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Submit manual do token
  // ─────────────────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      router.push(`/scan?token=${manualToken.trim()}`);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-foreground">Escanear QR Code</h1>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-sm space-y-6">
          {/* ── Área do scanner ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/*
              Div do leitor SEMPRE presente no DOM (visível apenas durante scan).
              Isso evita o erro "Element not found" do Html5Qrcode.
            */}
            <div id="qr-reader" className={`w-full ${scanning ? '' : 'hidden'}`} />

            {/*
              Estado inicial: câmera ainda não foi iniciada e não há erro
              Exibe botão "Iniciar câmera" para garantir gesto do usuário
            */}
            {!scanning && !error && (
              <div className="flex h-64 flex-col items-center justify-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                {cameraAvailable === false && (
                  <p className="text-sm text-destructive text-center">
                    Nenhuma câmera encontrada neste dispositivo.
                  </p>
                )}

                {cameraAvailable === null && (
                  <p className="text-sm text-muted-foreground text-center">
                    Verificando disponibilidade da câmera...
                  </p>
                )}

                {cameraAvailable === true && (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Aponte a câmera para o QR Code exibido no computador
                    </p>
                    <button
                      onClick={startScanner}
                      className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      Iniciar câmera
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Scanner ativo: overlay com moldura guia */}
            {scanning && (
              <div className="relative">
                {/* Overlay com guia de leitura sobre o vídeo */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="relative h-64 w-64">
                    {/* Cantos da moldura */}
                    <div className="absolute -top-1 -left-1 h-5 w-5 border-l-2 border-t-2 border-primary" />
                    <div className="absolute -top-1 -right-1 h-5 w-5 border-r-2 border-t-2 border-primary" />
                    <div className="absolute -bottom-1 -left-1 h-5 w-5 border-l-2 border-b-2 border-primary" />
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 border-r-2 border-b-2 border-primary" />
                  </div>
                </div>

                {/* Texto de "Escaneando..." no topo */}
                <div className="pointer-events-none absolute left-0 right-0 top-3 z-10 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs text-foreground backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Escaneando...
                  </span>
                </div>
              </div>
            )}

            {/* Estado de erro */}
            {error && (
              <div className="flex h-64 flex-col items-center justify-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground text-center">{error}</p>
                <button
                  onClick={startScanner}
                  className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
            <h2 className="text-sm font-semibold text-foreground">Como escanear</h2>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                Abra o Messenger Web no seu computador
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                Um QR Code será exibido na tela
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                Toque em <strong>Iniciar câmera</strong> e aponte para o QR Code
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
                A conexão será confirmada automaticamente
              </li>
            </ol>
          </div>

          {/* Input manual do token */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Não consegue escanear? Digite o token manualmente
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Cole o token do QR Code"
                className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}