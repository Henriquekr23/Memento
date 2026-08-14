'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deleteAlbum } from '@/features/album-save/actions';
import { ShareControls } from '@/features/album-view/ShareControls';
import type { AlbumListItem } from '@/features/album-view/loadAlbum';

/** Uma linha da lista: abrir, compartilhar, apagar. */
export function AlbumCard({ album }: { album: AlbumListItem }) {
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
    <li className={`card p-5 ${pending ? 'opacity-50' : ''}`}>
      {/* Empilha no celular e vira linha a partir de sm: o cartão inteiro é
          alvo de toque, então os controles precisam de espaço próprio. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/album/${album.id}`}
            className="font-[family-name:var(--font-heading)] text-xl hover:underline"
          >
            {album.title}
          </Link>
          <p className="muted mt-1 text-sm">
            {album.photoCount} {album.photoCount === 1 ? 'foto' : 'fotos'} · {created}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ShareControls albumId={album.id} isPublic={album.isPublic} />
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="btn btn-secondary btn-sm"
          >
            Apagar
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
          {error}
        </p>
      )}

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
