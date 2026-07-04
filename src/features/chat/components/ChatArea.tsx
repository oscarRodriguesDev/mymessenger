'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { GrFormClock, GrCheckmark, GrAttachment, GrDocument, GrImage, GrVideo, GrMusic, GrSend } from "react-icons/gr";
import { IoCheckmarkDoneSharp, IoMicOutline, IoMicOffOutline } from "react-icons/io5";
import { HiPaperAirplane } from "react-icons/hi";
import { MessageStatus } from '@/features/chat/message-status';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ReactionPicker } from '@/components/ReactionPicker';
import { MessageReactions } from '@/components/MessageReactions';
import { HiEmojiHappy } from 'react-icons/hi';
import { ImageMessage } from '@/components/media/ImageMessage';
import { VideoMessage } from '@/components/media/VideoMessage';
import { AudioMessage } from '@/components/media/AudioMessage';
import { FileMessage } from '@/components/media/FileMessage';
import { AudioRecorder } from '@/components/AudioRecorder';

// Mapeia nomes de colunas do banco (snake_case) para camelCase
function mapPayload(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    conversationId: (raw.conversationId ?? raw.conversation_id) as string,
    senderId: (raw.senderId ?? raw.sender_id) as string,
    type: raw.type as string,
    text: raw.text as string | null,
    fileUrl: (raw.fileUrl ?? raw.file_url) as string | null,
    mimeType: raw.mimeType as string | null,
    fileSize: raw.fileSize as number | null,
    fileName: raw.fileName as string | null,
    status: (raw.status as MessageStatus) ?? MessageStatus.enviada,
    createdAt: (raw.createdAt ?? raw.created_at) as string,
    updatedAt: (raw.updatedAt ?? raw.updated_at) as string,
    reactions: (raw.reactions as Record<string, number>) ?? {},
  };
}

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
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
  status: MessageStatus;
  createdAt: string;
  expiresAt?: string | null;
  sender: Sender;
  isOptimistic?: boolean;
  clientMessageId?: string;
  reactions?: Record<string, number>;
}

interface ChatAreaProps {
  conversationId: string;
  currentUserId: string;
  members: Member[];
  typingIndicatorEnabled?: boolean;
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

  if (status === MessageStatus.nao_enviada) {
    return <GrFormClock color="#fdfdfd" />;
  }

  if (status === MessageStatus.enviada) {
    return <GrCheckmark color="#fdfdfd" className="w-3 h-3 text-gray-400" />;
  }

  if (status === MessageStatus.recebida || status === MessageStatus.lida) {
    const tickColor = status === MessageStatus.lida ? '#7eacf6' : '#9ca3af';
    return (
      <span className="inline-flex items-center gap-0.5">
        <IoCheckmarkDoneSharp color={tickColor} className="w-3 h-3" />
        {/*  <IoCheckmarkDoneSharp color={tickColor} className="w-3 h-3 -ml-1" /> */}

      </span>
    );
  }

  return null;
}

export function ChatArea({ conversationId, currentUserId, members, typingIndicatorEnabled = true }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showReactionFor, setShowReactionFor] = useState<string | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showTtlSelector, setShowTtlSelector] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState<number | null>(null);
  const [showClipMenu, setShowClipMenu] = useState(false);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optimisticIdRef = useRef(0);
  const clientMsgIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Item 11: Indicador de digitação
  const { typingUserNames, setTyping } = useTypingIndicator({
    conversationId,
    currentUserId,
    enabled: typingIndicatorEnabled,
  });

  // Limpa erro de áudio quando o recorder é fechado
  useEffect(() => {
    if (!showAudioRecorder) {
      setAudioError(null);
    }
  }, [showAudioRecorder]);

  // Item 19: Toggle reação
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        // Atualiza localmente com base no resultado
        setMessages(prev => prev.map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          if (data.added) {
            reactions[emoji] = (reactions[emoji] || 0) + 1;
          } else {
            if (reactions[emoji] <= 1) {
              delete reactions[emoji];
            } else {
              reactions[emoji]--;
            }
          }
          return { ...msg, reactions };
        }));
      }
    } catch {
      // Silêncio
    }
  }, []);

  // Item 20: Upload de mídia
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload/message-media', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error('Upload failed');
        return;
      }

      const mediaData = await uploadRes.json();

      // Enviar mensagem com a mídia
      const clientMessageId = `${currentUserId}-${Date.now()}-${clientMsgIdRef.current++}`;
      const optimisticId = `optimistic-${Date.now()}-${optimisticIdRef.current++}`;

      let messageType = 'file';
      if (mediaData.mimeType?.startsWith('image/')) messageType = 'image';
      else if (mediaData.mimeType?.startsWith('video/')) messageType = 'video';
      else if (mediaData.mimeType?.startsWith('audio/')) messageType = 'audio';

      const optimisticMessage: Message = {
        id: optimisticId,
        conversationId,
        senderId: currentUserId,
        type: messageType,
        text: null,
        fileUrl: mediaData.fileUrl,
        mimeType: mediaData.mimeType,
        fileSize: mediaData.fileSize,
        fileName: mediaData.fileName,
        clientMessageId,
        status: MessageStatus.nao_enviada,
        createdAt: new Date().toISOString(),
        sender: members.find(m => m.id === currentUserId) ?? { id: currentUserId, username: '', fullName: 'You', avatarUrl: null },
        isOptimistic: true,
      };

      setMessages(prev => [...prev, optimisticMessage]);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          clientMessageId,
          fileUrl: mediaData.fileUrl,
          mimeType: mediaData.mimeType,
          fileSize: mediaData.fileSize,
          fileName: mediaData.fileName,
        }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...message, isOptimistic: false, status: MessageStatus.enviada }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...msg, status: MessageStatus.nao_enviada }
            : msg
        ));
      }
    } catch {
      console.error('Upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [conversationId, currentUserId, members]);

  // Item 18: Envio de áudio gravado
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleAudioSend = useCallback(async (audioBlob: Blob) => {
    setUploadingFile(true);
    setAudioError(null);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, `audio-${Date.now()}.webm`);

      const uploadRes = await fetch('/api/upload/message-media', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errBody.error || 'Erro ao fazer upload do áudio');
      }

      const mediaData = await uploadRes.json();

      const clientMessageId = `${currentUserId}-${Date.now()}-${clientMsgIdRef.current++}`;
      const optimisticId = `optimistic-${Date.now()}-${optimisticIdRef.current++}`;

      const optimisticMessage: Message = {
        id: optimisticId,
        conversationId,
        senderId: currentUserId,
        type: 'audio',
        text: null,
        fileUrl: mediaData.fileUrl,
        mimeType: mediaData.mimeType,
        fileSize: mediaData.fileSize,
        fileName: mediaData.fileName,
        clientMessageId,
        status: MessageStatus.nao_enviada,
        createdAt: new Date().toISOString(),
        sender: members.find(m => m.id === currentUserId) ?? { id: currentUserId, username: '', fullName: 'You', avatarUrl: null },
        isOptimistic: true,
      };

      setMessages(prev => [...prev, optimisticMessage]);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          clientMessageId,
          fileUrl: mediaData.fileUrl,
          mimeType: mediaData.mimeType,
          fileSize: mediaData.fileSize,
          fileName: mediaData.fileName,
          expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...message, isOptimistic: false, status: MessageStatus.enviada }
            : msg
        ));
        setShowAudioRecorder(false);
      } else {
        const errBody = await res.json().catch(() => ({ error: 'Erro ao enviar mensagem' }));
        throw new Error(errBody.error || 'Erro ao enviar mensagem de áudio');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar áudio';
      console.error('Audio send failed:', msg);
      setAudioError(msg);
      throw err; // Propaga para o AudioRecorder saber que falhou
    } finally {
      setUploadingFile(false);
    }
  }, [conversationId, currentUserId, members, ttlSeconds]);

  // Marca uma mensagem como lida no servidor
  const markAsLida = (messageId: string) => {
    return fetch(`/api/messages/${messageId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: MessageStatus.lida }),
    });
  };

  // Marca todas as mensagens não lidas (de terceiros) como lidas
  const markUnreadAsLida = (list: Message[]) => {
    list
      .filter(m => m.senderId !== currentUserId && m.status !== MessageStatus.lida)
      .forEach(m => markAsLida(m.id));
  };

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // 1. Carrega mensagens iniciais
    fetch(`/api/messages?conversationId=${conversationId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (cancelled) return;
        const reversed = data.reverse() as Message[];
        setMessages(reversed);
        markUnreadAsLida(reversed);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // 2. Escuta INSERT na tabela de eventos de status (disparado pela trigger)
    //    Quando qualquer cliente marca como lida/recebida, a trigger insere
    //    um registro aqui e o Realtime propaga para todos.
    const statusChannel = supabase
      .channel(`status_events:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_status_events',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const messageId = (row.messageId ?? row.message_id) as string;
          const newStatus = row.status as MessageStatus;
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, status: newStatus } : msg
          ));
        }
      )
      .subscribe();

    // 3. Canal para novas mensagens (INSERT na tabela messages)
    const msgChannel = supabase
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
          const raw = mapPayload(payload.new as Record<string, unknown>);
          const senderMember = members.find(m => m.id === raw.senderId);

          // Se eu recebi a mensagem, marco como lida (isso dispara a trigger
          // que insere em message_status_events, avisando o remetente)
          if (raw.senderId !== currentUserId) {
            await markAsLida(raw.id);
          }

          setMessages(prev => {
            if (prev.some(m => m.id === raw.id)) return prev;
            return [...prev, {
              ...raw,
              status: raw.senderId !== currentUserId
                ? MessageStatus.lida
                : raw.status,
              sender: senderMember ?? { id: '', username: '', fullName: '', avatarUrl: null },
              isOptimistic: false,
            }];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [conversationId, members, currentUserId]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Função reutilizável para enviar mensagem (nova ou retry)
  const sendMessage = useCallback(async (text: string, clientMessageId: string, optimisticId: string, expiresIn?: number) => {
    setSending(true);
    try {
      const body: Record<string, unknown> = { conversationId, text, clientMessageId };
      if (expiresIn) {
        body.expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...message, isOptimistic: false, status: MessageStatus.enviada }
            : msg
        ));
        return true;
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticId
            ? { ...msg, status: MessageStatus.nao_enviada }
            : msg
        ));
        return false;
      }
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticId
          ? { ...msg, status: MessageStatus.nao_enviada }
          : msg
      ));
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // Gera clientMessageId para deduplicação (Item 13)
    const clientMessageId = `${currentUserId}-${Date.now()}-${clientMsgIdRef.current++}`;
    const optimisticId = `optimistic-${Date.now()}-${optimisticIdRef.current++}`;

    const optimisticMessage: Message = {
      id: optimisticId,
      conversationId,
      senderId: currentUserId,
      type: 'text',
      text: newMessage.trim(),
      fileUrl: null,
      clientMessageId,
      status: MessageStatus.nao_enviada,
      createdAt: new Date().toISOString(),
      sender: members.find(m => m.id === currentUserId) ?? { id: currentUserId, username: '', fullName: 'You', avatarUrl: null },
      isOptimistic: true,
    };

    // Adiciona imediatamente na tela e limpa o input
    setMessages(prev => [...prev, optimisticMessage]);
    const textToSend = newMessage.trim();
    setNewMessage('');

    await sendMessage(textToSend, clientMessageId, optimisticId, ttlSeconds ?? undefined);
    setTtlSeconds(null);
    setShowTtlSelector(false);
  };

  // Retry de mensagem que falhou
  const handleRetry = useCallback(async (msg: Message) => {
    if (sending) return;
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, status: MessageStatus.nao_enviada } : m
    ));
    const clientMessageId = msg.clientMessageId || `${currentUserId}-${Date.now()}-retry`;
    // Re-envia incluindo fileUrl se houver
    if (msg.fileUrl) {
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            clientMessageId,
            fileUrl: msg.fileUrl,
            mimeType: msg.mimeType,
            fileSize: msg.fileSize,
            fileName: msg.fileName,
          }),
        });
        if (res.ok) {
          const message = await res.json();
          setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...message, isOptimistic: false, status: MessageStatus.enviada } : m
          ));
        } else {
          setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, status: MessageStatus.nao_enviada } : m
          ));
        }
      } catch {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, status: MessageStatus.nao_enviada } : m
        ));
      }
    } else {
      await sendMessage(msg.text || '', clientMessageId, msg.id);
    }
  }, [sending, sendMessage, currentUserId, conversationId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-background to-secondary/10">
      <div className="flex-1 overflow-auto space-y-3 p-4 sm:space-y-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-4xl">💬</div>
              <p className="text-sm text-muted-foreground sm:text-base">Nenhuma mensagem ainda. Comece a conversa!</p>
            </div>
          </div>
        )}
        {messages.map(message => {
          const isOwn = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => { setHoveredMessageId(null); setShowReactionFor(null); }}
            >
              <div
                className={`flex items-end gap-2 max-w-[85%] sm:gap-3 sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''
                  }`}
              >
                {!isOwn && (
                  <Avatar
                    src={message.sender.avatarUrl}
                    fallback={message.sender.fullName}
                    size="sm"
                  />
                )}
                <div className="relative">
                  {/* Renderização baseada no tipo da mensagem */}
                  <div
                    className={`rounded-2xl px-3 py-2 sm:px-5 sm:py-3 ${isOwn
                      ? 'bg-[#3d6b4f] text-primary-foreground shadow-lg'
                      : 'bg-secondary text-foreground border border-border'
                      }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold mb-0.5 text-muted-foreground">
                        {message.sender.fullName}
                      </p>
                    )}

                    {/* #20: Mídia - Imagem */}
                    {message.type === 'image' && message.fileUrl && (
                      <ImageMessage fileUrl={message.fileUrl} fileName={message.fileName || 'Imagem'} isOwn={isOwn} />
                    )}

                    {/* #20: Mídia - Vídeo */}
                    {message.type === 'video' && message.fileUrl && (
                      <VideoMessage fileUrl={message.fileUrl} fileName={message.fileName || 'Vídeo'} isOwn={isOwn} />
                    )}

                    {/* #18: Mídia - Áudio */}
                    {message.type === 'audio' && message.fileUrl && (
                      <AudioMessage fileUrl={message.fileUrl} fileName={message.fileName || 'Áudio'} isOwn={isOwn} />
                    )}

                    {/* #20: Mídia - Arquivo */}
                    {message.type === 'file' && message.fileUrl && (
                      <FileMessage fileUrl={message.fileUrl} fileName={message.fileName || 'Arquivo'} fileSize={message.fileSize} isOwn={isOwn} />
                    )}

                    {/* Texto */}
                    {message.text && (
                      <p className="text-xs break-words sm:text-sm">{message.text}</p>
                    )}

                    {/* #14: Exibir badge de expiração se mensagem for efêmera */}
                    {message.expiresAt && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                          ⏱ Expira em {Math.max(0, Math.floor((new Date(message.expiresAt).getTime() - Date.now()) / 1000 / 60))}min
                        </span>
                      </div>
                    )}

                    {/* #19: Reações - exibir abaixo do conteúdo */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="mt-1">
                        <MessageReactions
                          reactions={message.reactions}
                          onEmojiClick={(emoji) => toggleReaction(message.id, emoji)}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1 sm:gap-2 sm:mt-2">
                      {isOwn && message.status === MessageStatus.nao_enviada && (
                        <button
                          onClick={() => handleRetry(message)}
                          disabled={sending}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors mr-1"
                          title="Tentar novamente"
                        >
                          Reenviar
                        </button>
                      )}
                      <span
                        className={`text-xs ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
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

                  {/* #19: Botão de reação que aparece no hover */}
                  {hoveredMessageId === message.id && (
                    <div className={`absolute -top-3 ${isOwn ? 'left-0' : 'right-0'}`}>
                      <ReactionPicker
                        isOpen={showReactionFor === message.id}
                        onSelect={(emoji) => toggleReaction(message.id, emoji)}
                        onClose={() => setShowReactionFor(null)}
                      />
                      <button
                        onClick={() => setShowReactionFor(showReactionFor === message.id ? null : message.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-xs shadow-sm hover:bg-secondary transition-colors"
                        title="Reagir"
                      >
                        😊
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator typingUserNames={typingUserNames} />
      <form onSubmit={handleSend} className="sticky bottom-0 z-10 border-t border-border bg-card/50 backdrop-blur-sm">

        {/* #20: TTL Selector (acima da caixa de texto, quando ativo) */}
        {showTtlSelector && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0">⏱ Expirar em:</span>
            {[60, 300, 1800, 3600, 86400].map(sec => {
              const label = sec < 60 ? `${sec}s` :
                sec < 3600 ? `${sec / 60}min` :
                sec < 86400 ? `${sec / 3600}h` :
                `${sec / 86400}d`;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTtlSeconds(ttlSeconds === sec ? null : sec)}
                  className={`shrink-0 px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    ttlSeconds === sec
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {ttlSeconds && (
              <button
                type="button"
                onClick={() => { setTtlSeconds(null); setShowTtlSelector(false); }}
                className="shrink-0 px-2 py-0.5 text-xs text-red-400 hover:text-red-300"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {/* Caixa de texto unificada */}
        <div className="flex items-center gap-1 px-2 pb-2 pt-1 sm:px-3 sm:pb-3">
          <div className="flex flex-1 items-center gap-1 rounded-2xl bg-secondary/80 border border-border px-2 py-1 sm:px-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all duration-200 max-w-full">

            {/* Botão de clipe (abre menu de opções) */}
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => setShowClipMenu(!showClipMenu)}
                disabled={uploadingFile || showAudioRecorder}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors disabled:opacity-40"
                title="Mais opções"
              >
                {uploadingFile ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <GrAttachment className="h-5 w-5" />
                )}
              </button>

              {/* Dropdown do clipe - abre para CIMA e alinhado à ESQUERDA */}
              {showClipMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowClipMenu(false); setShowVibePicker(false); }} />
                  <div className="absolute bottom-full left-0 mb-2 z-50 max-w-[90vw]">
                    <div className="bg-card border border-border rounded-xl shadow-xl p-1.5 min-w-[180px] max-w-[90vw]">
                      {!showVibePicker ? (
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowClipMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors"
                          >
                            <span className="text-lg">📷</span>
                            <span>Imagem</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAudioRecorder(true);
                              setShowClipMenu(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors"
                          >
                            <IoMicOutline className="text-lg" />
                            <span>Áudio</span>
                          </button>
                          <button
                            type="button"
                            disabled
                            onClick={() => alert('🎥 Recurso de vídeo será disponibilizado em breve!')}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground/40 hover:bg-secondary/50 rounded-lg transition-colors cursor-not-allowed"
                            title="Em breve"
                          >
                            <span className="text-lg">🎥</span>
                            <span>Vídeo</span>
                            <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">Em breve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowVibePicker(true)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors"
                          >
                            <HiEmojiHappy className="text-lg" />
                            <span>Vibe</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTtlSelector(!showTtlSelector);
                              setShowClipMenu(false);
                            }}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                              ttlSeconds ? 'text-yellow-500 bg-yellow-500/10' : 'text-foreground hover:bg-secondary'
                            }`}
                          >
                            <span className="text-lg">⏱</span>
                            <span>Temporário</span>
                            {ttlSeconds && <span className="ml-auto text-[10px] text-yellow-500">Ativo</span>}
                          </button>
                        </div>
                      ) : (
                        /* Sub-menu de Vibe */
                        <div>
                          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border mb-1">
                            <button
                              type="button"
                              onClick={() => setShowVibePicker(false)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar sinal</span>
                          </div>
                          <div className="flex gap-1 px-2 py-1 flex-wrap">
                            {[
                              { type: 'buzz' as const, emoji: '👋', label: 'Buzz' },
                              { type: 'poke' as const, emoji: '🤏', label: 'Poke' },
                              { type: 'wave' as const, emoji: '🖐️', label: 'Wave' },
                              { type: 'heartbeat' as const, emoji: '💓', label: 'Heartbeat' },
                              { type: 'fire' as const, emoji: '🔥', label: 'Fire' },
                            ].map(item => (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => {
                                  setShowClipMenu(false);
                                  setShowVibePicker(false);
                                  // Envia vibe via fetch
                                  fetch('/api/vibe', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      receiverId: members.find(m => m.id !== currentUserId)?.id || '',
                                      type: item.type,
                                      conversationId,
                                    }),
                                  }).catch(() => {});
                                }}
                                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                                title={item.label}
                              >
                                <span className="text-xl">{item.emoji}</span>
                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Audio Recorder (substitui o input quando ativo) */}
            {showAudioRecorder ? (
              <div className="flex-1 min-w-0">
                {audioError && (
                  <div className="mb-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">
                    {audioError}
                  </div>
                )}
                <AudioRecorder onSend={handleAudioSend} disabled={sending || uploadingFile} />
              </div>
            ) : (
              <input
                id="message"
                type="text"
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setTyping(e.target.value.length > 0);
                }}
                onBlur={() => setTyping(false)}
                disabled={sending || uploadingFile}
                className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground border-0 outline-none focus:outline-none focus:ring-0 px-1 py-1.5"
              />
            )}

            {/* Botão de enviar (setinha) - sempre visível */}
            <button
              type="submit"
              disabled={(!newMessage.trim() && !showAudioRecorder) || sending || uploadingFile}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title="Enviar"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <HiPaperAirplane className="h-4 w-4 rotate-90" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
