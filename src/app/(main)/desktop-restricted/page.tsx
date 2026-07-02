import Link from 'next/link';

export default function DesktopRestrictedPage() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-6">
        {/* Ícone de celular */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-12 w-12 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Messenger Web disponível!
        </h1>

        <p className="text-muted-foreground leading-relaxed">
          Acesse o Messenger no seu computador escaneando um QR code com o seu celular.
          É rápido, seguro e funciona igual ao WhatsApp Web.
        </p>

        <div className="space-y-3">
          <Link
            href="/web-access"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Abrir Messenger Web
          </Link>

          <p className="text-xs text-muted-foreground">
            Você verá um QR code na tela. Escaneie com o app do celular para conectar.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm text-muted-foreground">
            Ainda prefere usar só o celular?{' '}
            <span className="text-foreground">O app continua disponível apenas em dispositivos móveis.</span>
          </p>
        </div>
      </div>
    </div>
  );
}