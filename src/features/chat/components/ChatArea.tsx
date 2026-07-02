'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { HiCheck, HiOutlineClock } from 'react-icons/hi';
import { MessageStatus } from '@/features/chat/message-status';

interface Sender {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  text: string | null;
  fileUrl: string | null;
  status: MessageStatus;
  createdAt: string;
  sender: Sender;
  isOptimistic?: boolean;
}

interface ChatAreaProps {
  conversationId: string;
  currentUserId: string;
  members: Member[];
}

interface Member {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

// Componente de ícones de status
function MessageStatusIcon({ status, isOwn }: { status: MessageStatus; isOwn: boolean }) {
  if (!isOwn) return null;

  const tickClass = status === MessageStatus.lida ? 'text-blue-500' : 'text-gray-400';

  if (status === MessageStatus.nao_enviada) {
    return (
      <HiOutlineClock className="w-3 h-3 animate-spin text-gray-400" />
    );
  }

  if (status === MessageStatus.enviada) {
    return <HiCheck className={`w-3 h-3 ${tickClass}`} />;
  }

  if (status === MessageStatus.recebida || status === MessageStatus.lida) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <HiCheck className={`w-3 h-3 ${tickClass}`} />
        <HiCheck className={`w-3 h-3 ${tickClass} -ml-1`} />
      </span>
    );
  }

  return null;
}

export function ChatArea({ conversationId, currentUserId, members }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optimisticIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    fetch(`/api/messages?conversationId=${conversationId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (!cancelled) setMessages(data.reverse()); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${conversationId}`,
        },
        async (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const msgId = raw.id as string;
          const senderId = raw.senderId as string;
          const senderMember = members.find(m => m.id === senderId);

          // Se eu não sou o remetente, marco como delivered
          if (senderId !== currentUserId) {
            // Marca como delivered no banco
            await fetch(`/api/messages/${msgId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: MessageStatus.recebida }),
            });
          }

          setMessages(prev => {
            if (prev.some(m => m.id === msgId)) return prev;
            return [...prev, {
              id: msgId,
              conversationId: raw.conversationId as string,
              senderId,
              type: raw.type as string,
              text: raw.text as string | null,
              fileUrl: raw.fileUrl as string | null,
              status: senderId !== currentUserId ? MessageStatus.recebida : ((raw.status as MessageStatus) || MessageStatus.enviada),
              createdAt: raw.createdAt as string,
              sender: senderMember ?? { id: '', username: '', fullName: '', avatarUrl: null },
              isOptimistic: false,
            }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const msgId = raw.id as string;
          const newStatus = raw.status as MessageStatus;
          setMessages(prev => prev.map(msg =>
            msg.id === msgId
              ? { ...msg, status: newStatus }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, members, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marca todas as mensagens não lidas como 'read' quando o componente monta
  useEffect(() => {
    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        m =>         m.senderId !== currentUserId && m.status !== MessageStatus.lida
      );

      for (const message of unreadMessages) {
        await fetch(`/api/messages/${message.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: MessageStatus.lida }),
        });
      }
    };

    // Aguarda um pouco para garantir que o componente está totalmente carregado
    const timeout = setTimeout(markAsRead, 500);
    return () => clearTimeout(timeout);
  }, [conversationId]); // Executa quando a conversa muda

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);

    // Cria mensagem otimista imediatamente
    const optimisticId = `optimistic-${Date.now()}-${optimisticIdRef.current++}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversationId,
      senderId: currentUserId,
      type: 'text',
      text: newMessage.trim(),
      fileUrl: null,
      status: MessageStatus.nao_enviada,
      createdAt: new Date().toISOString(),
      sender: members.find(m => m.id === currentUserId) ?? { id: currentUserId, username: '', fullName: 'You', avatarUrl: null },
      isOptimistic: true,
    };

    // Adiciona imediatamente na tela e limpa o input
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: newMessage.trim() }),
      });

      if (res.ok) {
        const message = await res.json();
        // Substitui a mensagem otimista pela real do banco
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...message, isOptimistic: false, status: MessageStatus.enviada }
            : msg
        ));
      } else {
        // Falha: marca como erro (mantém pending ou muda para error)
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...msg, status: MessageStatus.nao_enviada }
            : msg
        ));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mantém como nao_enviada para retry
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticId
          ? { ...msg, status: MessageStatus.nao_enviada }
          : msg
      ));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map(message => {
          const isOwn = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''
                  }`}
              >
                {!isOwn && (
                  <Avatar
                    src={message.sender.avatarUrl}
                    fallback={message.sender.fullName}
                    size="sm"
                  />
                )}
                <div
                  className={`rounded-lg px-4 py-2 ${isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                    }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1">
                      {message.sender.fullName}
                    </p>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <MessageStatusIcon status={message.status} isOwn={isOwn} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            id="message"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
