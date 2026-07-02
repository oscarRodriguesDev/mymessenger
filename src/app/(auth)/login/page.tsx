'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(identifier, password);
      router.push('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Messenger</h1>
        <p className="text-muted-foreground text-sm">Entre na sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {message === 'check-email' && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-sm text-primary">
            Conta criada! Verifique seu email para confirmar a inscrição.
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Input
          id="identifier"
          type="text"
          label="Nome de usuário ou Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          placeholder="seu_nome ou voce@email.com"
        />

        <Input
          id="password"
          type="password"
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Esqueceu a senha?
        </Link>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Se inscreva
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
