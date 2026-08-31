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
      <section className="card p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-lg">
          Álbum finalizado
        </h2>
        <p className="muted mt-1 text-sm">
          Enviado em {finished}. Ninguém pode mudar a montagem nem mandar fotos
          novas — nem você, enquanto ele estiver assim. O link público e o PDF
          continuam funcionando normalmente.
        </p>
        <button
          type="button"
          onClick={() => run(() => reopenAlbum(albumId))}
          disabled={pending}
          className="btn btn-secondary btn-sm mt-4"
        >
          {pending ? 'Reabrindo…' : 'Reabrir a edição'}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="font-[family-name:var(--font-heading)] text-lg">
        Dar o álbum por pronto
      </h2>
      <p className="muted mt-1 text-sm">
        Enquanto o álbum está em montagem, você e quem você convidou podem mexer
        nele. Enviar fecha a montagem: nada mais entra e nada mais muda até você
        reabrir.
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="btn btn-primary btn-sm mt-4"
      >
        {pending ? 'Enviando…' : 'Enviar álbum'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
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
    </section>
  );
}
