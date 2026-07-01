'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

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
  status: string;
  createdAt: string;
  sender: Sender;
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

export function ChatArea({ conversationId, currentUserId, members }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const msgId = raw.id as string;
          const senderId = raw.senderId as string;
          const senderMember = members.find(m => m.id === senderId);
          setMessages(prev => {
            if (prev.some(m => m.id === msgId)) return prev;
            return [...prev, {
              id: msgId,
              conversationId: raw.conversationId as string,
              senderId,
              type: raw.type as string,
              text: raw.text as string | null,
              fileUrl: raw.fileUrl as string | null,
              status: raw.status as string,
              createdAt: raw.createdAt as string,
              sender: senderMember ?? { id: '', username: '', fullName: '', avatarUrl: null },
            }];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: newMessage.trim() }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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
                className={`flex items-end gap-2 max-w-[70%] ${
                  isOwn ? 'flex-row-reverse' : ''
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
                  className={`rounded-lg px-4 py-2 ${
                    isOwn
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
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
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
