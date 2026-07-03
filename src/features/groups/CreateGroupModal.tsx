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

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    fetch('/api/follows/list?type=friends')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ contact?: { id: string; username: string; fullName: string; avatarUrl: string | null }; user?: { id: string; username: string; fullName: string; avatarUrl: string | null } }>) => {
        if (!cancelled) {
          setContacts(
            data
              .map((item) => item.contact || item.user)
              .filter(Boolean) as { id: string; username: string; fullName: string; avatarUrl: string | null }[]
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
    if (!groupName.trim()) {
      setError('Escolha um nome para o grupo');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Selecione pelo menos um membro');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        onClose();
        router.push('/chat');
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar grupo');
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
          <h2 className="text-lg font-semibold">Criar Grupo</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Group name */}
        <div className="border-b border-border px-5 py-4">
          <Input
            label="Nome do grupo"
            placeholder="Ex: Família, Amigos do trabalho..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        {/* Members list */}
        <div className="max-h-80 overflow-y-auto px-5 py-3">
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
          <Button onClick={handleCreate} disabled={loading || selectedIds.size === 0}>
            {loading ? 'Criando...' : `Criar grupo (${selectedIds.size + 1})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
