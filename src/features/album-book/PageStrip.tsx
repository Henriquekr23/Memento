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
  onAddPage: () => void;
  onRemovePage: (page: AlbumPage) => void;
}

function PageThumb({
  page,
  index,
  isCurrent,
  onSelect,
  onRemove,
}: {
  page: AlbumPage;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.key });

  const slots = PAGE_LAYOUTS[page.layoutId].slots;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group/thumb relative ${isDragging ? 'z-10 opacity-80' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        title={`Página ${page.number} — arraste para reordenar`}
        className={[
          'group relative block h-20 w-16 cursor-grab overflow-hidden rounded-md border transition active:cursor-grabbing',
          isCurrent
            ? 'border-[var(--color-accent)] shadow-lg shadow-amber-400/10'
            : 'border-[var(--color-divider)] hover:border-[var(--color-divider)]',
        ].join(' ')}
        style={{ background: 'var(--paper-base)' }}
      >
        {page.photos.length === 0 ? (
          <span
            className="flex h-full items-center justify-center text-[10px]"
            style={{ color: 'var(--paper-ink-soft)' }}
          >
            vazia
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
          className="absolute bottom-0 right-0 rounded-tl bg-[color-mix(in_srgb,var(--color-neutral-900)_88%,transparent)] px-1 text-[9px] leading-tight text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]"
          aria-hidden
        >
          {index + 1}
        </span>
      </button>

      {/* Dentro dos limites da miniatura: a lista rola na horizontal, e
          overflow-x recorta o que sai por cima — o círculo ficava cortado. */}
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRemove}
        title="Remover a página — as fotos voltam para o depósito"
        aria-label="Remover página"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-neutral-900)_88%,transparent)] text-[10px] leading-none text-[color-mix(in_srgb,var(--color-text)_80%,transparent)] opacity-0 shadow-md backdrop-blur transition hover:bg-red-500 hover:text-[var(--color-text)] group-hover/thumb:opacity-100 focus-visible:opacity-100"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 14h10l1-14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
  onAddPage,
  onRemovePage,
}: PageStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 text-xs font-medium text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]">
          Páginas
          <span className="text-[11px] text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">{pages.length}</span>
        </h2>
        <p className="text-[11px] text-[color-mix(in_srgb,var(--color-text)_35%,transparent)]">
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
                onRemove={() => onRemovePage(page)}
              />
            ))}

            {/* Página fantasma: o lugar de criar uma página nova é o fim da
                lista, onde ela vai aparecer. */}
            <li className="shrink-0">
              <button
                type="button"
                onClick={onAddPage}
                title="Nova página em branco, pronta para receber fotos do depósito"
                aria-label="Adicionar página"
                className="flex h-20 w-16 items-center justify-center rounded-md border border-dashed border-[var(--color-divider)] text-lg text-[color-mix(in_srgb,var(--color-text)_40%,transparent)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-700)]"
              >
                +
              </button>
            </li>
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
