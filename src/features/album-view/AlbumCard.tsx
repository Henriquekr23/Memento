'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deleteAlbum } from '@/features/album-save/actions';
import { ShareControls } from '@/features/album-view/ShareControls';
import type { AlbumListItem } from '@/features/album-view/loadAlbum';

/**
 * Um cartão da lista: abrir, editar, compartilhar, apagar.
 *
 * A capa no topo é o alvo maior e abre o álbum — é o que a pessoa mais faz
 * aqui. Embaixo, o link público (só do dono) e as ações. "Apagar" é um ícone
 * no canto, longe de "Editar": não divide fileira, tamanho nem cor com as
 * ações que constroem.
 *
 * `variant` diz de quem é o álbum. No álbum de outra pessoa — aquele em que
 * este usuário foi convidado a montar — não existe link público nem apagar:
 * quem compartilha e quem desfaz é o dono. O que sobra é abrir e editar, que é
 * exatamente o que o convite deu.
 */
export function AlbumCard({
  album,
  variant = 'mine',
}: {
  album: AlbumListItem;
  variant?: 'mine' | 'shared';
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const created = new Date(album.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function remove() {
    setConfirming(false);
    startTransition(async () => {
      const result = await deleteAlbum(album.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="ac-album" data-pending={pending || undefined}>
      <Link href={`/album/${album.id}`} className="ac-album-cover" aria-label={`Abrir ${album.title}`}>
        <span aria-hidden className="ac-album-book">
          <span className="ac-album-book-title">{album.title}</span>
        </span>
        <span aria-hidden className="ac-album-open">Abrir</span>
      </Link>

      <div className="ac-album-body">
        <div className="ac-album-head">
          <h3 className="ac-album-title">
            <Link href={`/album/${album.id}`}>{album.title}</Link>
          </h3>
          {variant === 'mine' && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="ac-icon-btn is-danger"
              aria-label={`Apagar ${album.title}`}
              title="Apagar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
            </button>
          )}
        </div>

        <p className="ac-album-meta">
          <span>
            {album.photoCount} {album.photoCount === 1 ? 'foto' : 'fotos'}
          </span>
          <span aria-hidden>·</span>
          <span>{created}</span>
          {album.lockedAt && <span className="ac-badge">Finalizado</span>}
          {variant === 'shared' && <span className="ac-badge is-soft">Convidado</span>}
        </p>

        {variant === 'mine' && (
          <ShareControls albumId={album.id} isPublic={album.isPublic} />
        )}

        <div className="ac-album-actions">
          <Link href={`/album/${album.id}`} className="af-btn af-btn-ghost ac-btn">
            Abrir
          </Link>
          {/* Álbum finalizado não oferece editar: a bancada recusaria a
              abertura, e um botão que leva a um aviso é um botão quebrado. */}
          {!album.lockedAt && (
            <Link href={`/album/${album.id}/editar`} className="af-btn af-btn-ghost ac-btn">
              Editar
            </Link>
          )}
        </div>

        {error && (
          <p role="alert" className="ac-error">
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Apagar "${album.title}"?`}
        description="As fotos guardadas na nuvem e o link compartilhado somem para sempre. Os arquivos no seu computador continuam intactos."
        confirmLabel="Apagar"
        destructive
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </li>
  );
}
