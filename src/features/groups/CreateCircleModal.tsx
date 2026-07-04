'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TTL_OPTIONS = [
  { label: '1 hora', value: 3600 },
  { label: '6 horas', value: 21600 },
  { label: '24 horas', value: 86400 },
  { label: '3 dias', value: 259200 },
  { label: '7 dias', value: 604800 },
] as const;

export function CreateCircleModal({ isOpen, onClose }: CreateCircleModalProps) {
  const router = useRouter();
  const [circleName, setCircleName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ttl, setTtl] = useState<number>(86400); // 24h default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    fetch('/api/follows/list?type=friends')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ contact?: Contact; user?: Contact }>) => {
        if (!cancelled) {
          setContacts(
            data
              .map((item) => item.contact || item.user)
              .filter(Boolean) as Contact[]
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!circleName.trim()) {
      setError('Escolha um nome para o círculo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: circleName.trim(),
          memberIds: Array.from(selectedIds),
          ttl,
        }),
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar círculo');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Criar Círculo 🔥</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Circle name */}
        <div className="border-b border-border px-5 py-4">
          <Input
            label="Nome do círculo"
            placeholder="Ex: Festa sábado, Churras..."
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
          />
        </div>

        {/* TTL selector */}
        <div className="border-b border-border px-5 py-4">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Tempo de duração
          </label>
          <div className="flex flex-wrap gap-2">
            {TTL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTtl(option.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  ttl === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members list */}
        <div className="max-h-72 overflow-y-auto px-5 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Participantes ({selectedIds.size} selecionados)
          </p>
          {contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado. Adicione amigos primeiro.
            </p>
          ) : (
            <div className="space-y-1">
              {contacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleMember(contact.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <Avatar
                      src={contact.avatarUrl}
                      fallback={contact.fullName}
                      size="sm"
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.fullName}</p>
                      <p className="text-xs text-muted-foreground">@{contact.username}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 pb-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Círculo 🔥'}
          </Button>
        </div>
      </div>
    </div>
  );
}
