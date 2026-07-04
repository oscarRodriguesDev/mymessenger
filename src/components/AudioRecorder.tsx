'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HiMicrophone, HiStop, HiTrash, HiPaperAirplane } from 'react-icons/hi';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'preview' | 'error';

const WAVEFORM_BARS = 32;
const BAR_HEIGHTS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface WaveformBarProps {
  active: boolean;
  index: number;
}

function WaveformBar({ active, index }: WaveformBarProps) {
  const height = BAR_HEIGHTS[index % BAR_HEIGHTS.length];

  return (
    <span
      className={`block w-[3px] rounded-full transition-all duration-150 ${
        active ? 'bg-primary scale-y-100' : 'bg-white/20 scale-y-50'
      }`}
      style={{
        height: `${height}px`,
        animationName: active ? 'waveform-pulse' : 'none',
        animationDuration: active ? `${0.3 + Math.random() * 0.4}s` : '0s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
        animationDelay: `${index * 0.05}s`,
      }}
    />
  );
}

export function AudioRecorder({ onSend, disabled = false }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [audioUrl]);

  // Detecta o melhor mimeType disponível para WebView/browser
  const getSupportedMimeType = useCallback((): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      '',
    ];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      // Verifica se MediaRecorder existe
      if (typeof MediaRecorder === 'undefined') {
        setState('error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Usa o mimeType real suportado pelo browser/WebView
      const recordedType = mimeType || recorder.mimeType || 'audio/webm';

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recordedType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState('preview');
        setElapsed(0);
      };

      recorder.start(100); // collect data every 100ms
      setState('recording');

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch {
      // Erro ao acessar microfone — mostra erro temporário e volta ao normal
      setState('error');
      setTimeout(() => {
        setState('idle');
      }, 2000);
    }
  }, [disabled, getSupportedMimeType]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cleanupMedia();
    setAudioBlob(null);
    setState('idle');
    setElapsed(0);
  }, [cleanupMedia]);

  const handleSend = useCallback(async () => {
    if (!audioBlob || sending) return;
    setSending(true);
    try {
      await onSend(audioBlob);
      // Só limpa se o envio foi bem-sucedido
      cleanupMedia();
      setAudioBlob(null);
      setState('idle');
    } catch {
      // Erro já foi tratado pelo ChatArea (setAudioError)
      // Não limpa o estado — mantém preview para tentar novamente
      console.warn('AudioRecorder: send failed, keeping preview');
    } finally {
      setSending(false);
    }
  }, [audioBlob, sending, onSend, cleanupMedia]);

  // Play/pause preview audio on state change
  useEffect(() => {
    if (state === 'preview' && audioUrl && audioRef.current) {
      audioRef.current.load();
    }
  }, [state, audioUrl]);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
      {/* Error — feedback rápido de erro no microfone */}
      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <HiMicrophone className="h-4 w-4" />
          <span>Microfone indisponível</span>
        </div>
      )}

      {/* Idle — mic button */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-40"
          title="Gravar áudio"
        >
          <HiMicrophone className="h-5 w-5" />
        </button>
      )}

      {/* Recording — stop button + timer + waveform */}
      {state === 'recording' && (
        <>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-9 w-9 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-white/10"
            title="Parar gravação"
          >
            <HiStop className="h-5 w-5" />
          </button>

          <span className="w-12 text-center font-mono text-xs text-red-400">
            {formatTime(elapsed)}
          </span>

          <div className="flex h-10 items-end gap-[2px]">
            {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
              <WaveformBar key={i} active={true} index={i} />
            ))}
          </div>

          <style>{`
            @keyframes waveform-pulse {
              0% { transform: scaleY(0.4); }
              100% { transform: scaleY(1); }
            }
          `}</style>
        </>
      )}

      {/* Preview — player + send/cancel */}
      {state === 'preview' && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl ?? undefined}
            controls
            className="h-9 w-48"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || disabled}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-white/10 disabled:opacity-40"
            title="Enviar áudio"
          >
            <HiPaperAirplane className="h-5 w-5 -rotate-45" />
          </button>

          <button
            type="button"
            onClick={cancelRecording}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
            title="Cancelar"
          >
            <HiTrash className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
