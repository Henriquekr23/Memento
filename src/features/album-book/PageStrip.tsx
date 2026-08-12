'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { PAGE_LAYOUTS } from '@/types/page';
import type { AlbumPage } from '@/lib/paginate';

interface PageStripProps {
  /** Páginas do miolo, na ordem em que aparecem no álbum. */
  pages: AlbumPage[];
  /** Índice do spread aberto, para destacar as páginas visíveis. */
  currentSpread: number;
  /** Índice da página dentro do array completo → spread. */
  spreadOfPage: (page: AlbumPage) => number | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectPage: (page: AlbumPage) => void;
}

function PageThumb({
  page,
  index,
  isCurrent,
  onSelect,
}: {
  page: AlbumPage;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.key });

  const slots = PAGE_LAYOUTS[page.layoutId].slots;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'z-10 opacity-80' : ''}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        title={
          page.kind === 'story'
            ? `Página de texto — arraste para reordenar`
            : `Página ${page.number} — arraste para reordenar`
        }
        className={[
          'group relative block h-20 w-16 cursor-grab overflow-hidden rounded-md border transition active:cursor-grabbing',
          isCurrent
            ? 'border-amber-400 shadow-lg shadow-amber-400/10'
            : 'border-white/15 hover:border-white/40',
        ].join(' ')}
        style={{ background: 'var(--paper-base)' }}
      >
        {page.kind === 'story' ? (
          <span className="flex h-full flex-col justify-center gap-1 px-2">
            {[85, 70, 90, 60].map((width, line) => (
              <span
                key={line}
                className="block h-[2px] rounded-full"
                style={{ width: `${width}%`, background: 'var(--paper-ink)', opacity: 0.35 }}
              />
            ))}
          </span>
        ) : (
          <span className="absolute inset-1">
            {page.photos.map((photo, slotIndex) => {
              const slot = slots[slotIndex] ?? slots[slots.length - 1];
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.previewUrl}
                  alt=""
                  draggable={false}
                  className="absolute rounded-[1px] object-cover p-[1px]"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${slot.w}%`,
                    height: `${slot.h}%`,
                  }}
                />
              );
            })}
          </span>
        )}

        <span
          className="absolute bottom-0 right-0 rounded-tl bg-neutral-950/70 px-1 text-[9px] leading-tight text-white/70"
          aria-hidden
        >
          {index + 1}
        </span>
      </button>
    </li>
  );
}

/**
 * Tira de páginas: a visão de cima do álbum.
 *
 * Serve para navegar (clique) e para reordenar (arraste). Tem o próprio
 * DndContext porque o do livro trata de fotos, e misturar os dois tipos de
 * arraste no mesmo contexto só criaria colisão de ids.
 */
export function PageStrip({
  pages,
  currentSpread,
  spreadOfPage,
  onReorder,
  onSelectPage,
}: PageStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (pages.length === 0) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pages.findIndex((page) => page.key === active.id);
    const to = pages.findIndex((page) => page.key === over.id);
    if (from === -1 || to === -1) return;
    onReorder(from, to);
  }

  return (
    <section aria-label="Páginas do álbum" className="select-none">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium text-white/70">
          Páginas
          <span className="ml-2 text-[11px] text-white/35">{pages.length}</span>
        </h2>
        <p className="text-[11px] text-white/35">
          clique para ir até a página · arraste para reordenar
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pages.map((page) => page.key)}
          strategy={horizontalListSortingStrategy}
        >
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {pages.map((page, index) => (
              <PageThumb
                key={page.key}
                page={page}
                index={index}
                isCurrent={spreadOfPage(page) === currentSpread}
                onSelect={() => onSelectPage(page)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
