'use client';

import { useRef, useState, useEffect } from 'react';

interface AudioMessageProps {
  fileUrl: string;
  fileName: string;
  duration?: number;
  isOwn: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioMessage({ fileUrl, fileName, duration, isOwn }: AudioMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMeta = () => setTotalDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const displayTime = formatDuration(currentTime);
  const displayTotal = totalDuration > 0 ? formatDuration(totalDuration) : '';

  return (
    <div
      className={`flex max-w-[280px] items-center gap-3 rounded-xl p-3 ${
        isOwn ? 'bg-primary/20' : 'bg-secondary'
      }`}
    >
      <audio ref={audioRef} src={fileUrl} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label={isPlaying ? 'Pausar' : 'Tocar'}
      >
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="8,5 19,12 8,19" />
          </svg>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted-foreground"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="truncate text-sm text-foreground" title={fileName}>
            {fileName}
          </span>
        </div>

        {/* Waveform bars */}
        <div className="flex h-6 items-end gap-[2px]">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full transition-all duration-150 ${
                isPlaying ? 'bg-primary' : 'bg-muted'
              }`}
              style={{
                height: `${Math.max(4, Math.sin((i / 20) * Math.PI) * 20 + 4)}px`,
                animation: isPlaying
                  ? `waveform 0.5s ease-in-out infinite alternate ${(i * 0.05).toFixed(2)}s`
                  : 'none',
              }}
            />
          ))}
          <style>{`
            @keyframes waveform {
              0% { transform: scaleY(0.5); }
              100% { transform: scaleY(1.4); }
            }
          `}</style>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{displayTime}</span>
          {displayTotal && <span>{displayTotal}</span>}
        </div>
      </div>
    </div>
  );
}
