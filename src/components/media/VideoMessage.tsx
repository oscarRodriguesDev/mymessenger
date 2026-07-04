'use client';

import { useRef, useState } from 'react';

interface VideoMessageProps {
  fileUrl: string;
  fileName: string;
  isOwn: boolean;
}

export function VideoMessage({ fileUrl, fileName, isOwn }: VideoMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  return (
    <div className="group relative overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        src={fileUrl}
        controls
        preload="metadata"
        className="max-h-[300px] w-auto max-w-full rounded-xl bg-black"
        onPlay={handlePlay}
        onPause={handlePause}
        aria-label={fileName}
      >
        <track kind="captions" src="" label="Legendas" />
        Seu navegador não suporta vídeo.
      </video>

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
          <div className="flex size-14 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
