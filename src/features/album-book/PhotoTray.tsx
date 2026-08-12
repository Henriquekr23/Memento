'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';

import { AddPhotosButton } from '@/features/photo-upload/AddPhotosButton';
import { formatDate } from '@/lib/format';
import type { Photo } from '@/types/photo';

/** Prefixo do id de arraste, para separar "veio do depósito" de "já está na página". */
export const TRAY_DRAG_PREFIX = 'tray:';

/** Id de drop do depósito inteiro: soltar aqui tira a foto da página. */
export const TRAY_DROP_ID = 'tray-drop';

export function isTrayDragId(id: string): boolean {
  return id.startsWith(TRAY_DRAG_PREFIX);
}

export function photoIdFromDragId(id: string): string {
  return isTrayDragId(id) ? id.slice(TRAY_DRAG_PREFIX.length) : id;
}

interface TrayPhotoProps {
  photo: Photo;
  onPlace: (photoId: string) => void;
}

function TrayPhoto({ photo, onPlace }: TrayPhotoProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_DRAG_PREFIX}${photo.id}`,
  });

  return (
    <li className="shrink-0">
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onPlace(photo.id)}
        title={`${photo.fileName} — clique para colocar na página aberta, ou arraste até a página que quiser`}
        className={[
          'group relative block h-24 w-24 cursor-grab overflow-hidden rounded-lg border transition active:cursor-grabbing',
          isDragging
            ? 'border-white/10 opacity-30'
            : 'border-white/15 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/10',
        ].join(' ')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt={photo.fileName}
          draggable={false}
          loading="lazy"
          className="h-full w-full select-none object-cover"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white/80">
          {formatDate(photo.timestamp)}
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-950/75 text-xs font-medium text-amber-300 opacity-0 transition group-hover:opacity-100">
          + colocar
        </span>
      </button>
    </li>
  );
}

interface PhotoTrayProps {
  photos: Photo[];
  isImporting: boolean;
  onPlace: (photoId: string) => void;
  onAddFiles: (files: File[]) => void;
}

/**
 * Depósito: as fotos importadas que não estão em nenhuma página.
 *
 * Fica sempre visível no modo Álbum, mesmo vazio — é o que torna o caminho de
 * ida e volta descobrível. É também um alvo de drop: arrastar uma foto da
 * página para cá tira ela do álbum sem apagar o arquivo.
 *
 * Por baixo, "estar no depósito" é o mesmo estado que "foto não incluída" no
 * modo Grade. Uma verdade só, duas maneiras de mexer nela.
 */
export function PhotoTray({
  photos,
  isImporting,
  onPlace,
  onAddFiles,
}: PhotoTrayProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id: TRAY_DROP_ID });

  const isReceiving =
    isOver && active !== null && !isTrayDragId(String(active.id));

  return (
    <section
      ref={setNodeRef}
      aria-label="Depósito de fotos"
      className={[
        'select-none rounded-2xl border border-dashed p-3 transition',
        isReceiving
          ? 'border-amber-400 bg-amber-400/10'
          : 'border-white/15 bg-white/[0.03]',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-xs font-medium text-white/70">
          Depósito
          {photos.length > 0 && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-300">
              {photos.length}
            </span>
          )}
          <AddPhotosButton onFilesSelected={onAddFiles} disabled={isImporting}>
            {isImporting ? 'lendo…' : '+ Fotos'}
          </AddPhotosButton>
        </h2>
        <p className="text-[11px] text-white/40">
          {photos.length === 0
            ? 'arraste uma foto da página para cá (ou use o ↑ no canto dela) para tirá-la do álbum'
            : 'clique para colocar na página aberta, ou arraste até a página que quiser'}
        </p>
      </div>

      {photos.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/25">
          Nenhuma foto aqui — todas estão no álbum.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo) => (
            <TrayPhoto key={photo.id} photo={photo} onPlace={onPlace} />
          ))}
        </ul>
      )}
    </section>
  );
}
