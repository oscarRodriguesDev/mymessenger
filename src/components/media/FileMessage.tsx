'use client';

import { GrDocument } from 'react-icons/gr';
import { FiDownload } from 'react-icons/fi';

interface FileMessageProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  isOwn: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase();
  return ext ?? '?';
}

export function FileMessage({ fileUrl, fileName, fileSize, isOwn }: FileMessageProps) {
  return (
    <a
      href={fileUrl}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        isOwn ? 'border-primary/30' : 'border-border'
      }`}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <GrDocument className="text-xl text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground" title={fileName}>
          {fileName}
        </span>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {fileSize != null && fileSize > 0 && (
            <span>{formatFileSize(fileSize)}</span>
          )}
          <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px] uppercase">
            {getFileExtension(fileName)}
          </span>
        </div>
      </div>

      <FiDownload
        className="shrink-0 text-lg text-muted-foreground transition-colors group-hover:text-foreground"
        aria-hidden="true"
      />
    </a>
  );
}
