'use client';

import { useEffect } from 'react';

import { useLang } from '@/features/i18n/LangProvider';

import { FLOW_COPY } from './copy';

/** Quanto tempo o "Desfazer" fica na tela. */
const UNDO_MS = 5000;

/**
 * "Foto tirada do álbum. Desfazer", por cinco segundos.
 *
 * Um aviso por vez: tirar outra foto troca `token` e recomeça a contagem. Quem
 * guarda o que desfazer é quem chama; aqui só mora o tempo e o botão.
 */
export function UndoToast({
  token,
  onUndo,
  onDone,
}: {
  /** Muda a cada foto tirada; `null` esconde. */
  token: string | null;
  onUndo: () => void;
  onDone: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];

  useEffect(() => {
    if (token === null) return;
    const handle = window.setTimeout(onDone, UNDO_MS);
    return () => window.clearTimeout(handle);
  }, [token, onDone]);

  return (
    <div className="af-toast" role="status" aria-live="polite" data-open={token !== null || undefined}>
      {token !== null && (
        <>
          <span>{t.removed}</span>
          <button type="button" className="af-toast-undo" onClick={onUndo}>
            {t.undo}
          </button>
        </>
      )}
    </div>
  );
}
