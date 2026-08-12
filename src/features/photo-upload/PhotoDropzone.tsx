'use client';

import { useCallback, useRef, useState } from 'react';

import { ACCEPTED_MIME_TYPES } from './importPhotos';

interface PhotoDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  /** Versão compacta, usada quando o álbum já tem fotos. */
  compact?: boolean;
}

export function PhotoDropzone({
  onFilesSelected,
  disabled = false,
  compact = false,
}: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleFiles(event.dataTransfer.files);
      }}
      className={[
        'rounded-2xl border border-dashed transition-colors',
        compact ? 'px-5 py-4' : 'px-8 py-14 text-center',
        isDragging
          ? 'border-amber-400 bg-amber-400/10'
          : 'border-white/20 bg-white/[0.03] hover:border-white/35',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div
        className={
          compact
            ? 'flex flex-wrap items-center justify-between gap-3'
            : 'flex flex-col items-center gap-3'
        }
      >
        <div className={compact ? '' : 'flex flex-col items-center gap-2'}>
          {!compact && (
            <span aria-hidden className="text-3xl">
              📷
            </span>
          )}
          <p className="text-sm font-medium text-white">
            {compact
              ? 'Adicionar mais fotos ao álbum'
              : 'Arraste as fotos da sua viagem para cá'}
          </p>
          {!compact && (
            <p className="max-w-md text-sm text-white/50">
              As fotos são lidas no seu navegador. Nenhum arquivo é enviado para
              nenhum servidor.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
        >
          Selecionar fotos
        </button>
      </div>
    </div>
  );
}
