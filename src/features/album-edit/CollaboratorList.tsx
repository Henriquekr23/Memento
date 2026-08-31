'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { removeCollaborator } from './actions';
import type { Collaborator } from './loadCollaborators';

/**
 * Quem está montando o álbum junto — e o botão de tirar.
 *
 * Existe porque fechar o convite **não** tira ninguém: o link deixa de deixar
 * gente nova entrar, e quem já entrou continua dentro. Sem esta lista, o dono
 * não teria como saber quem tem acesso à bancada nem como revogá-lo.
 */
export function CollaboratorList({
  albumId,
  collaborators,
}: {
  albumId: string;
  collaborators: Collaborator[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (collaborators.length === 0) return null;

  function remove(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCollaborator(albumId, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <h2 className="font-[family-name:var(--font-heading)] text-lg">
        Montando junto com você
      </h2>
      <p className="muted mt-1 text-sm">
        {collaborators.length}{' '}
        {collaborators.length === 1 ? 'pessoa entrou' : 'pessoas entraram'} pelo
        convite de edição. Tirar alguém daqui fecha a bancada para essa pessoa
        na hora; o que ela já montou continua no álbum.
      </p>

      <ul className="mt-4 space-y-2">
        {collaborators.map((person) => (
          <li
            key={person.userId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-3 py-2"
          >
            <span className="truncate text-sm">{person.name || 'Alguém'}</span>
            <button
              type="button"
              onClick={() => remove(person.userId)}
              disabled={pending}
              className="btn btn-secondary btn-sm"
            >
              Tirar
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
          {error}
        </p>
      )}
    </section>
  );
}
