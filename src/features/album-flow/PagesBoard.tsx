'use client';

import { useEffect, useMemo, useState } from 'react';

import { IconX } from '@/features/album-editor/icons';
import { useLang } from '@/features/i18n/LangProvider';
import { useIsTouch } from '@/hooks/useMediaQuery';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import { toPages, type Cells } from './cells';
import { PER_PAGE_OPTIONS, toSpreads, type PerPage } from './paginate';
import { photoName } from './Timeline';

/** Tipo de dado do arraste entre quadros desta grade. */
const DND_TYPE = 'text/memento-slot';

function isSlotDrag(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(DND_TYPE);
}

/**
 * As páginas do álbum antes do editor: aberturas A5, N fotos por página.
 *
 * Um controle só, "Fotos por página", e ele vale para o álbum inteiro — ajuste
 * por página é trabalho do editor. Cada quadro é um lugar (`cells.ts`): soltar
 * uma foto sobre outra troca as duas, sem empurrar o resto (inserir
 * desmontaria todas as páginas seguintes); soltar num quadro vazio leva a foto
 * para ali, e o quadro de onde ela saiu fica vazio.
 *
 * Três jeitos de fazer o mesmo: arrastar (mouse), tocar numa foto e depois no
 * quadro de destino (dedo), Enter numa e Enter no destino (teclado). Esc ou
 * tocar de novo na mesma cancela.
 */
export function PagesBoard({
  cells,
  photosById,
  perPage,
  onPerPage,
  onPlace,
  onRemove,
}: {
  /** Os quadros, página após página (vazio = `null`). */
  cells: Cells;
  photosById: ReadonlyMap<string, Photo>;
  perPage: PerPage;
  onPerPage: (perPage: PerPage) => void;
  /** Leva a foto ao quadro: troca se estiver ocupado, muda se estiver vazio. */
  onPlace: (id: string, cellIndex: number) => void;
  onRemove: (id: string) => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const isTouch = useIsTouch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const spreads = useMemo(() => toSpreads(toPages(cells, perPage)), [cells, perPage]);
  const isEmpty = cells.every((id) => id === null);

  // Seleção de uma foto que saiu (X, linha do tempo) não pode ficar pendurada.
  const selected = selectedId && cells.includes(selectedId) ? selectedId : null;

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const pickPhoto = (id: string, cellIndex: number) => {
    if (!selected) setSelectedId(id);
    else if (selected === id) setSelectedId(null);
    else {
      onPlace(selected, cellIndex);
      setSelectedId(null);
    }
  };

  const dropOn = (cellIndex: number, event: React.DragEvent) => {
    if (!isSlotDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData(DND_TYPE) || dragId;
    setDragId(null);
    setOverKey(null);
    if (id) onPlace(id, cellIndex);
  };

  return (
    <div className="af-pages" data-selecting={selected ? true : undefined}>
      <div className="af-pages-head">
        <div>
          <h2 className="lp-h af-h2">{t.pages}</h2>
          <p className="af-help">{isTouch ? t.pagesHelpTouch : t.pagesHelpPointer}</p>
        </div>
        <div role="group" aria-label={t.perPage} className="af-perpage">
          <span aria-hidden className="af-perpage-label">
            {t.perPage}
          </span>
          {PER_PAGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className="af-perpage-btn"
              aria-pressed={perPage === n}
              aria-label={t.perPageAria(n)}
              onClick={() => onPerPage(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <p className="af-help af-pages-empty">{t.pagesEmpty}</p>
      ) : (
        <div className="af-spreads">
          {spreads.map(([left, right], spreadIndex) => {
            const first = spreadIndex * 2 + 1;
            return (
              <div
                key={spreadIndex}
                role="group"
                aria-label={t.spreadAria(first, first + 1)}
                className="af-spread"
              >
                {[left, right].map((slots, side) => {
                  const pageIndex = spreadIndex * 2 + side;
                  return (
                    <div key={side} className="af-page" data-per={perPage}>
                      {slots.map((photoId, slotIndex) => {
                        const cellIndex = pageIndex * perPage + slotIndex;
                        const key = `cell-${cellIndex}`;
                        const photo = photoId ? photosById.get(photoId) : undefined;
                        const isOver = overKey === key && dragId !== photoId;

                        const dragTarget = {
                          onDragOver: (event: React.DragEvent) => {
                            if (!isSlotDrag(event)) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          },
                          onDragEnter: (event: React.DragEvent) => {
                            if (isSlotDrag(event)) setOverKey(key);
                          },
                          onDragLeave: (event: React.DragEvent) => {
                            const next = event.relatedTarget as Node | null;
                            if (!next || !event.currentTarget.contains(next)) {
                              setOverKey((current) => (current === key ? null : current));
                            }
                          },
                          onDrop: (event: React.DragEvent) => dropOn(cellIndex, event),
                        };

                        if (!photo) {
                          return (
                            <div
                              key={key}
                              className="af-slot is-empty"
                              data-over={isOver || undefined}
                              {...dragTarget}
                            >
                              <button
                                type="button"
                                className="af-slot-hit"
                                tabIndex={selected ? 0 : -1}
                                aria-label={selected ? t.moveHereAria : t.emptySlotAria}
                                onClick={() => {
                                  if (!selected) return;
                                  onPlace(selected, cellIndex);
                                  setSelectedId(null);
                                }}
                              />
                            </div>
                          );
                        }

                        const isSelected = selected === photo.id;
                        const name = photoName(photo);
                        return (
                          <div
                            key={photo.id}
                            className="af-slot"
                            data-over={isOver || undefined}
                            data-sel={isSelected || undefined}
                            data-dragging={dragId === photo.id || undefined}
                            {...dragTarget}
                          >
                            <button
                              type="button"
                              className="af-slot-hit"
                              draggable
                              aria-pressed={isSelected}
                              aria-label={
                                selected && !isSelected
                                  ? t.swapWithAria(name)
                                  : t.slotAria(name, isSelected)
                              }
                              onClick={() => pickPhoto(photo.id, cellIndex)}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData(DND_TYPE, photo.id);
                                setDragId(photo.id);
                                setSelectedId(null);
                              }}
                              onDragEnd={() => {
                                setDragId(null);
                                setOverKey(null);
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.previewUrl} alt="" draggable={false} loading="lazy" />
                            </button>
                            <button
                              type="button"
                              className="af-slot-x"
                              aria-label={t.removeAria(name)}
                              onClick={() => {
                                setSelectedId(null);
                                onRemove(photo.id);
                              }}
                            >
                              <IconX size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
