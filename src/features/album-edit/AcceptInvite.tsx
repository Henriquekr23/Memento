'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { acceptEditInvite } from '@/features/album-contrib/actions';

/**
 * O aceite de um convite de montagem.
 *
 * Entrar é um ato explícito, e não um efeito de abrir a página: a linha em
 * `album_editors` dá acesso de escrita ao álbum de outra pessoa e aparece para
 * o dono com nome e data. Quem clicou aqui sabe que entrou; quem só abriu o
 * link por curiosidade não entra em lista nenhuma.
 */
export function AcceptInvite({
  token,
  title,
  authorName,
}: {
  token: string;
  title: string;
  authorName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptEditInvite(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/album/${result.data}/editar`);
    });
  }

  return (
    <section className="card p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl">
        Montar “{title}” junto
      </h2>
      <p className="muted mt-2 text-sm">
        {authorName || 'Quem montou o álbum'} abriu a bancada para você: dá para
        acrescentar fotos, mexer nas páginas, na capa e nos textos. É o mesmo
        álbum — o que você mudar, todo mundo vê. Uma pessoa por vez, e a última
        gravação é a que fica.
      </p>
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="btn btn-primary btn-sm mt-5"
      >
        {pending ? 'Abrindo…' : 'Abrir a montagem'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
          {error}
        </p>
      )}
    </section>
  );
}
