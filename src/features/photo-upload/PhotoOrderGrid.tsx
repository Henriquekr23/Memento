'use client';

import { useState } from 'react';

import { IconChevronLeft, IconChevronRight, IconTrash } from '@/features/album-editor/icons';
import type { EditorCopy } from '@/features/album-editor/copy';
import type { Photo } from '@/types/photo';

interface PhotoOrderGridProps {
  photos: Photo[];
  copy: EditorCopy;
  /** Move a primeira foto para a posição da segunda. */
  onMove: (fromId: string, toId: string) => void;
  onRemove: (id: string) => void;
}

/** Tipo de dado do arrasto entre cartões desta grade. */
const DND_TYPE = 'text/memento-order';

/**
 * As fotos importadas, na ordem em que vão virar páginas.
 *
 * É a única tela em que a pessoa vê a viagem inteira de uma vez, antes de o
 * álbum existir — por isso a foto vem grande e a moldura some. Reordenar é
 * arrastar; as duas setas de cada cartão fazem o mesmo pelo teclado, porque
 * arrastar com o teclado não existe.
 */
export function PhotoOrderGrid({ photos, copy, onMove, onRemove }: PhotoOrderGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <ol className="pg-grid">
      {photos.map((photo, index) => {
        const previous = photos[index - 1];
        const next = photos[index + 1];

        return (
          <li
            key={photo.id}
            className={[
              'pg-card',
              dragId === photo.id ? 'is-dragging' : '',
              overId === photo.id && dragId !== photo.id ? 'is-over' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(DND_TYPE, photo.id);
              event.dataTransfer.effectAllowed = 'move';
              setDragId(photo.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (overId !== photo.id) setOverId(photo.id);
            }}
            onDragLeave={() => setOverId((current) => (current === photo.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const from = event.dataTransfer.getData(DND_TYPE);
              setDragId(null);
              setOverId(null);
              if (from && from !== photo.id) onMove(from, photo.id);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.previewUrl} alt={photo.fileName} draggable={false} />

            <span className="pg-ordinal" aria-hidden>
              {index + 1}
            </span>

            <button
              type="button"
              className="pg-act pg-del"
              aria-label={copy.startRemovePhoto(photo.fileName)}
              title={copy.startRemovePhoto(photo.fileName)}
              onClick={() => onRemove(photo.id)}
            >
              <IconTrash size={13} />
            </button>

            <span className="pg-moves">
              <button
                type="button"
                className="pg-act"
                aria-label={copy.startMoveLeft}
                title={copy.startMoveLeft}
                disabled={!previous}
                onClick={() => previous && onMove(photo.id, previous.id)}
              >
                <IconChevronLeft size={13} />
              </button>
              <button
                type="button"
                className="pg-act"
                aria-label={copy.startMoveRight}
                title={copy.startMoveRight}
                disabled={!next}
                onClick={() => next && onMove(photo.id, next.id)}
              >
                <IconChevronRight size={13} />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
