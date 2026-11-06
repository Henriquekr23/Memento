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
    <div className="av-sub">
      <p className="av-sublabel">
        Montando junto com você · {collaborators.length}
      </p>
      <ul className="av-people">
        {collaborators.map((person) => (
          <li key={person.userId} className="av-person">
            <span aria-hidden className="av-person-avatar">
              {(person.name || 'A').trim().charAt(0).toUpperCase()}
            </span>
            <span className="av-person-name">{person.name || 'Alguém'}</span>
            <button
              type="button"
              onClick={() => remove(person.userId)}
              disabled={pending}
              className="af-link av-person-out"
              title="Fecha a bancada para essa pessoa na hora. O que ela montou continua no álbum."
            >
              Tirar
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="ac-error">
          {error}
        </p>
      )}
    </div>
  );
}
