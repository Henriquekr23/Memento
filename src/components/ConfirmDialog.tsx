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
        className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--color-neutral-900)_50%,transparent)] backdrop-blur-sm"
      />

      <div className="elev-lg relative flex w-full max-w-sm flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-[var(--space-4)]">
        <h2
          id="confirm-title"
          className="m-0 font-[family-name:var(--font-heading)] text-xl font-semibold"
        >
          {title}
        </h2>
        <p
          id="confirm-description"
          className="m-0 text-sm leading-relaxed opacity-85"
        >
          {description}
        </p>

        <div className="mt-2 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
