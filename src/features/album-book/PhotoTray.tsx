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
            ? 'border-[var(--color-divider)] opacity-30'
            : 'border-[var(--color-divider)] hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-amber-400/10',
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
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[color-mix(in_srgb,var(--color-neutral-900)_88%,transparent)] to-transparent px-1.5 pb-1 pt-4 text-[10px] text-[color-mix(in_srgb,var(--color-text)_80%,transparent)]">
          {formatDate(photo.timestamp)}
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] text-xs font-medium text-[var(--color-accent-700)] opacity-0 transition group-hover:opacity-100">
          + colocar
        </span>
      </button>
    </li>
  );
}

interface PhotoTrayProps {
  photos: Photo[];
  /** Quantas fotos estão nas páginas — o resto do total, que é `photos`. */
  albumCount: number;
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
  albumCount,
  isImporting,
  onPlace,
  onAddFiles,
}: PhotoTrayProps) {
  const totalCount = albumCount + photos.length;
  const { setNodeRef, isOver, active } = useDroppable({ id: TRAY_DROP_ID });

  const isReceiving =
    isOver && active !== null && !isTrayDragId(String(active.id));

  return (
    <section
      ref={setNodeRef}
      aria-label="Depósito de fotos"
      className={[
        'select-none rounded-[var(--radius-md)] border border-dashed p-3 transition',
        isReceiving
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
          : 'border-[var(--color-divider)] bg-transparent',
      ].join(' ')}
    >
      {/* Título à esquerda, ação à direita, e a dica só quando há o que fazer
          com ela: vazio, a instrução vive no centro do próprio espaço vazio,
          onde o olho já está procurando. */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-text)_55%,transparent)]">
          Depósito
          {photos.length > 0 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--color-accent-700)]">
              {photos.length}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          {photos.length > 0 && (
            <p className="hidden text-[11px] text-[color-mix(in_srgb,var(--color-text)_40%,transparent)] sm:block">
              clique para colocar na página aberta, ou arraste até ela
            </p>
          )}
          <AddPhotosButton onFilesSelected={onAddFiles} disabled={isImporting}>
            {isImporting ? 'lendo…' : '+ Fotos'}
          </AddPhotosButton>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="mx-auto max-w-[46ch] py-5 text-center text-xs leading-5 text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">
          Nenhuma foto aqui — todas estão no álbum. Arraste uma foto da página
          para cá (ou use o ↑ no canto dela) para tirá-la.
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo) => (
            <TrayPhoto key={photo.id} photo={photo} onPlace={onPlace} />
          ))}
        </ul>
      )}

      {/* A contagem mora aqui e não na barra: é sobre estas fotos, e no canto
          ela informa sem disputar atenção com o livro. */}
      <p className="mt-1 text-right text-[11px] tabular-nums text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">
        {albumCount} de {totalCount} {totalCount === 1 ? 'foto' : 'fotos'} no
        álbum
      </p>
    </section>
  );
}
