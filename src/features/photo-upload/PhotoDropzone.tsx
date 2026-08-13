'use client';

import { useCallback, useRef, useState } from 'react';

import { useIsTouch } from '@/hooks/useMediaQuery';

import { ACCEPTED_MIME_TYPES } from './importPhotos';

interface PhotoDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  /** Versão compacta, usada quando o álbum já tem fotos. */
  compact?: boolean;
}

/**
 * A entrada das fotos.
 *
 * No mouse é uma zona de arrastar, com o botão como alternativa. No toque não
 * existe arrastar arquivo: a moldura tracejada e o "arraste para cá" viravam
 * decoração em volta do único caminho que funciona. Ali o botão é a tela
 * inteira — grande, com o texto certo, e sem prometer um gesto impossível.
 */
export function PhotoDropzone({
  onFilesSelected,
  disabled = false,
  compact = false,
}: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isTouch = useIsTouch();

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
        'rounded-[var(--radius-md)] border border-dashed transition-colors',
        compact ? 'px-5 py-4' : 'px-5 py-8 text-center sm:px-8 sm:py-16',
        isDragging
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
          : 'border-[var(--color-divider)] bg-transparent hover:border-[var(--color-divider)]',
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
            : 'flex flex-col items-center gap-4'
        }
      >
        {/* No toque a frase some: ela só descreve um gesto que não existe ali,
            e sem ela o botão vira o centro da tela, que é o que ele é. */}
        {!(isTouch && !compact) && (
          <p
            className={
              compact
                ? 'text-sm font-medium text-[var(--color-text)]'
                : 'font-[family-name:var(--font-heading)] text-[19px] font-normal text-[var(--color-text)]'
            }
          >
            {compact
              ? 'Adicionar mais fotos ao álbum'
              : isDragging
                ? 'Pode soltar'
                : 'Arraste suas fotos para cá'}
          </p>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={[
            'btn btn-primary',
            isTouch && !compact ? 'w-full py-3.5 text-[15px]' : '',
          ].join(' ')}
        >
          {isTouch && !compact ? 'Escolher fotos do celular' : 'Selecionar fotos'}
        </button>
      </div>
    </div>
  );
}
