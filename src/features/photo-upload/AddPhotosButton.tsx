'use client';

import { useRef } from 'react';

import { ACCEPTED_MIME_TYPES } from './importPhotos';

interface AddPhotosButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Botão discreto para somar fotos ao álbum já montado.
 * A área grande de arrastar só aparece no começo, quando ainda não há nada —
 * depois disso ela só ocupa espaço na tela.
 */
export function AddPhotosButton({
  onFilesSelected,
  disabled = false,
  className = '',
  children = '+ Fotos',
}: AddPhotosButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) onFilesSelected(Array.from(files));
          event.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={
          className ||
          'btn btn-secondary btn-sm disabled:opacity-40'
        }
      >
        {children}
      </button>
    </>
  );
}
