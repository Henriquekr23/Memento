'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';

import { finishAlbum, reopenAlbum } from './actions';

/**
 * O gesto de dar o álbum por pronto — "enviar o álbum".
 *
 * O que ele faz, dito sem rodeio na tela: tranca a edição, para o dono e para
 * quem foi convidado, e fecha a porta das contribuições. É o momento em que o
 * álbum vira uma coisa entregue.
 *
 * Reabrir é do dono, e existe porque a alternativa (tranca definitiva) faria
 * de um clique errado um álbum perdido. A data de finalização continua
 * guardada — reabrir não apaga que ele já esteve pronto uma vez, e a tela
 * continua dizendo isso.
 */
export function FinishControls({
  albumId,
  lockedAt,
  photoCount,
}: {
  albumId: string;
  lockedAt: string | null;
  photoCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Não foi possível concluir.');
        return;
      }
      router.refresh();
    });
  }

  if (lockedAt) {
    const finished = new Date(lockedAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="av-item">
        <div className="av-item-head">
          <div className="av-item-text">
            <h3 className="av-item-title">Álbum finalizado</h3>
            <p className="ac-hint">
              Enviado em {finished}. A montagem está travada para todo mundo e o convite
              não recebe fotos. O link público e o PDF continuam funcionando.
            </p>
          </div>
          <button
            type="button"
            onClick={() => run(() => reopenAlbum(albumId))}
            disabled={pending}
            className="af-btn af-btn-ghost af-btn-sm"
          >
            {pending ? 'Reabrindo…' : 'Reabrir a edição'}
          </button>
        </div>
        {error && (
          <p role="alert" className="ac-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="av-item">
      <div className="av-item-head">
        <div className="av-item-text">
          <h3 className="av-item-title">Dar o álbum por pronto</h3>
          <p className="ac-hint">
            Trava a montagem e fecha o convite — para você e para quem você chamou. Dá
            para reabrir depois.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="af-btn af-btn-ghost af-btn-sm"
        >
          {pending ? 'Enviando…' : 'Enviar álbum'}
        </button>
      </div>

      {error && (
        <p role="alert" className="ac-error">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="Enviar este álbum?"
        description={`As ${photoCount} foto(s) e a montagem ficam como estão. A edição trava para todo mundo e o convite para de receber fotos. Você pode reabrir depois, quando quiser.`}
        confirmLabel="Enviar álbum"
        onConfirm={() => run(() => finishAlbum(albumId))}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
