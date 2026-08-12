'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ações destrutivas ganham o botão vermelho. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmação para ações que não dão para desfazer.
 *
 * Componente burro e reutilizável: não sabe o que está confirmando. O foco vai
 * para o "cancelar" de propósito — quem abriu por engano sai teclando Enter ou
 * Esc sem perder nada.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-neutral-950/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-base font-semibold text-white">
          {title}
        </h2>
        <p
          id="confirm-description"
          className="mt-2 text-sm leading-relaxed text-white/60"
        >
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition',
              destructive
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-amber-400 text-neutral-950 hover:bg-amber-300',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
