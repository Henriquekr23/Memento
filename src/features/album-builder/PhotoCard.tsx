'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { formatDateTime, formatFileSize } from '@/lib/format';
import type { Photo } from '@/types/photo';

interface PhotoCardProps {
  photo: Photo;
  /** Posição no álbum final (só as fotos incluídas são numeradas). */
  position: number | null;
  tripDay: number | null;
  onRemove: (id: string) => void;
  onToggleIncluded: (id: string) => void;
}

export function PhotoCard({
  photo,
  position,
  tripDay,
  onRemove,
  onToggleIncluded,
}: PhotoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'group relative overflow-hidden rounded-xl border bg-neutral-900 transition',
        isDragging
          ? 'z-10 border-amber-400 opacity-90 shadow-xl shadow-black/50'
          : 'border-white/10',
        photo.included ? '' : 'opacity-40',
      ].join(' ')}
    >
      <div
        {...attributes}
        {...listeners}
        className="block cursor-grab active:cursor-grabbing"
        aria-label={`Arrastar ${photo.fileName}`}
      >
        <div className="relative aspect-square bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt={photo.fileName}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />

          {position !== null && (
            <span className="absolute left-2 top-2 rounded-full bg-neutral-950/80 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur">
              {String(position).padStart(2, '0')}
            </span>
          )}

          {tripDay !== null && (
            <span className="absolute right-2 top-2 rounded-full bg-neutral-950/80 px-2 py-0.5 text-[11px] font-medium text-white/70 backdrop-blur">
              Dia {tripDay}
            </span>
          )}
        </div>

        <div className="space-y-1 px-3 py-2.5">
          <p className="truncate text-xs font-medium text-white" title={photo.fileName}>
            {photo.fileName}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span>{formatDateTime(photo.timestamp)}</span>
            {photo.timestampSource === 'file' && (
              <span
                title="Sem data no EXIF — usando a data do arquivo"
                className="rounded bg-white/10 px-1 text-[10px] text-white/60"
              >
                sem EXIF
              </span>
            )}
          </p>
          <p className="flex items-center gap-2 text-[11px] text-white/35">
            <span>{formatFileSize(photo.sizeInBytes)}</span>
            {photo.exif.gps && <span title="Tem coordenadas GPS">📍 GPS</span>}
          </p>
        </div>
      </div>

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onToggleIncluded(photo.id)}
          title={photo.included ? 'Tirar do álbum' : 'Colocar no álbum'}
          className="rounded-full bg-neutral-950/85 px-2 py-1 text-xs text-white/80 backdrop-blur transition hover:bg-neutral-800"
        >
          {photo.included ? '👁' : '🚫'}
        </button>
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          title="Remover foto"
          className="rounded-full bg-neutral-950/85 px-2 py-1 text-xs text-red-300 backdrop-blur transition hover:bg-red-500/20"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
