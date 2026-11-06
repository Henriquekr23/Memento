'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { IconPlus, IconX } from '@/features/album-editor/icons';
import { isDated } from '@/features/album-builder/selection';
import { useLang } from '@/features/i18n/LangProvider';
import { useIsTouch } from '@/hooks/useMediaQuery';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import {
  MAX_PER_PAGE,
  SORT_MODES,
  groupsKey,
  type PageGroups,
  type SortMode,
} from './pageGroups';
import { photoName } from './photoName';

/** Tipo de dado do arraste entre fotos desta etapa. */
const DND_TYPE = 'text/memento-order';

function isOrderDrag(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(DND_TYPE);
}

/** Duração e curva do deslize até o lugar novo. */
const MOVE_MS = 420;
const MOVE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * As fotos deslizam até o lugar novo em vez de saltar (FLIP).
 *
 * Medida por `getBoundingClientRect`, e não `offsetLeft/Top`: com uma coluna
 * por página, a foto que muda de coluna muda de pai, e o `offset*` dela
 * passaria a contar de outra régua. A medida é tirada logo depois da troca,
 * antes da pintura — a rolagem não anda entre as duas leituras.
 */
function useReorderMotion(rootRef: React.RefObject<HTMLElement | null>, orderKey: string) {
  const positions = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>('[data-photo]');
    const next = new Map<string, DOMRect>();
    nodes.forEach((node) => next.set(node.dataset.photo ?? '', node.getBoundingClientRect()));

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      nodes.forEach((node) => {
        const before = positions.current.get(node.dataset.photo ?? '');
        const after = next.get(node.dataset.photo ?? '');
        if (!before || !after) return;
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        node.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
          duration: MOVE_MS,
          easing: MOVE_EASE,
        });
      });
    }
    positions.current = next;
  }, [rootRef, orderKey]);
}

/** Onde a foto arrastada vai entrar: página e posição dentro dela. */
interface DropTarget {
  group: number;
  index: number;
}

/**
 * Etapa 2: a ordem das fotos, já dividida em páginas — uma coluna por página,
 * com até `MAX_PER_PAGE` fotos. A etapa 3 monta as páginas exatamente assim.
 *
 * Mexer é **inserir**: arrastar uma foto para cima ou para baixo de outra, em
 * qualquer coluna, mostra a linha de onde ela vai entrar; soltar no vazio da
 * coluna põe no fim dela; soltar em "Nova página" abre uma página. Coluna
 * cheia não recebe foto de outra coluna e avisa. Sem arraste: tocar numa foto
 * e depois onde ela entra; pelo teclado, Enter e as setas (↑ ↓ na página,
 * ← → para a página vizinha).
 *
 * No canto, as ordenações padrão. Elas reordenam as fotos **mantendo as
 * colunas** (mesmas contagens por página); "Personalizado" volta para a última
 * divisão feita à mão.
 */
export function PhotoSorter({
  photos,
  groups,
  outside,
  sortMode,
  onSort,
  onMoveTo,
  onRemove,
  onRestore,
}: {
  /** Quem está no álbum. */
  photos: readonly Photo[];
  /** As páginas: ids, na ordem. */
  groups: PageGroups;
  /** Quem foi tirado. */
  outside: readonly Photo[];
  sortMode: SortMode;
  onSort: (mode: SortMode) => void;
  onMoveTo: (id: string, group: number, index: number) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const isTouch = useIsTouch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useReorderMotion(rootRef, groupsKey(groups));

  const byId = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);

  const when = useMemo(() => {
    const day = new Intl.DateTimeFormat(t.locale, { weekday: 'short', day: 'numeric' });
    const time = new Intl.DateTimeFormat(t.locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    // "sáb 14", sem o ponto e a vírgula que o formato curto do pt-BR põe.
    const dayLabel = (date: Date) =>
      day
        .formatToParts(date)
        .filter((part) => part.type === 'weekday' || part.type === 'day')
        .map((part) => part.value.replace('.', ''))
        .join(' ');
    return (photo: Photo) =>
      isDated(photo) ? `${dayLabel(photo.timestamp)} · ${time.format(photo.timestamp)}` : t.noTime;
  }, [t.locale, t.noTime]);

  const groupOf = (id: string) => groups.findIndex((group) => group.includes(id));
  const selected = selectedId && byId.has(selectedId) ? selectedId : null;
  /** A foto em movimento: a arrastada ou a escolhida pelo toque. */
  const moving = dragId ?? selected;
  const movingFrom = moving ? groupOf(moving) : -1;
  const canTake = (group: number) =>
    group === movingFrom || (groups[group]?.length ?? 0) < MAX_PER_PAGE;

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  /** Depois de mover pelo teclado, o foco segue a foto até o lugar novo. */
  const focusPhoto = (id: string) =>
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLElement>(`[data-photo="${id}"] .af-sort-hit`)?.focus(),
    );

  const endDrag = () => {
    setDragId(null);
    setDrop(null);
  };

  const commit = (target: DropTarget) => {
    if (!moving) return;
    if (target.group < groups.length && !canTake(target.group)) return;
    onMoveTo(moving, target.group, target.index);
    setSelectedId(null);
    endDrag();
  };

  /** Toque/clique: escolher a foto, e depois a foto antes da qual ela entra. */
  const pick = (id: string, group: number, index: number) => {
    if (!selected) return setSelectedId(id);
    if (selected === id) return setSelectedId(null);
    const from = groupOf(selected);
    const fromIndex = groups[from].indexOf(selected);
    // Na mesma página, descer uma foto põe a escolhida *depois* do alvo.
    commit({ group, index: from === group && fromIndex < index ? index + 1 : index });
  };

  const onArrow = (event: React.KeyboardEvent, id: string, group: number, index: number) => {
    if (selected !== id) return;
    let target: DropTarget | null = null;
    if (event.key === 'ArrowUp' && index > 0) target = { group, index: index - 1 };
    if (event.key === 'ArrowDown' && index < groups[group].length - 1) {
      target = { group, index: index + 2 };
    }
    if (event.key === 'ArrowLeft' && group > 0) {
      target = { group: group - 1, index: groups[group - 1].length };
    }
    if (event.key === 'ArrowRight' && group < groups.length - 1) {
      target = { group: group + 1, index: groups[group + 1].length };
    }
    if (!target) return;
    event.preventDefault();
    if (target.group !== group && (groups[target.group]?.length ?? 0) >= MAX_PER_PAGE) return;
    onMoveTo(id, target.group, target.index);
    focusPhoto(id);
  };

  /** Arrastando por cima de uma coluna: a posição sai da altura do ponteiro. */
  const overColumn = (event: React.DragEvent, group: number) => {
    if (!isOrderDrag(event) || !dragId) return;
    if (!canTake(group)) {
      setDrop((current) => (current?.group === group ? current : { group, index: -1 }));
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-photo]'),
    );
    let index = items.length;
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    if (drop?.group !== group || drop.index !== index) setDrop({ group, index });
  };

  /** Número de cada foto no álbum inteiro (01, 02…), atravessando as páginas. */
  const starts = groups.reduce<number[]>(
    (acc, group, i) => [...acc, i === 0 ? 0 : acc[i - 1] + groups[i - 1].length],
    [],
  );

  return (
    <div
      ref={rootRef}
      className="af-sort af-pages-sort"
      data-selecting={selected ? true : undefined}
      data-dragging={dragId ? true : undefined}
    >
      <div className="af-sort-head">
        <div>
          <p className="af-mono af-muted">
            {t.inAlbum(photos.length)} · {t.pagesCount(groups.length)}
          </p>
          <p className="af-help">{isTouch ? t.orderHelpTouch : t.orderHelpPointer}</p>
        </div>
        <SortMenu mode={sortMode} onSort={onSort} />
      </div>

      {photos.length === 0 ? (
        <p className="af-help">{t.orderEmpty}</p>
      ) : (
        <ol className="af-pages" aria-label={t.orderTitle}>
          {groups.map((group, groupIndex) => {
            const full = group.length >= MAX_PER_PAGE;
            const isOver = drop?.group === groupIndex;
            const refused = isOver && drop.index < 0;
            return (
              <li
                key={group[0] ?? groupIndex}
                className="af-page-col"
                data-over={(isOver && !refused) || undefined}
                data-refused={refused || undefined}
                onDragOver={(event) => overColumn(event, groupIndex)}
                onDragLeave={(event) => {
                  const next = event.relatedTarget as Node | null;
                  if (!next || !event.currentTarget.contains(next)) {
                    setDrop((current) => (current?.group === groupIndex ? null : current));
                  }
                }}
                onDrop={(event) => {
                  if (!isOrderDrag(event) || !drop || drop.group !== groupIndex) return;
                  event.preventDefault();
                  commit(drop);
                }}
              >
                <div className="af-page-col-head">
                  <span className="af-page-col-title">{t.pageColumn(groupIndex + 1)}</span>
                  <span className="af-page-col-count" data-full={full || undefined}>
                    {refused ? t.pageFull : `${group.length}/${MAX_PER_PAGE}`}
                  </span>
                </div>

                <ol className="af-page-photos">
                  {group.map((id, index) => {
                    const photo = byId.get(id);
                    if (!photo) return null;
                    const running = starts[groupIndex] + index + 1;
                    const name = photoName(photo);
                    const isSelected = selected === id;
                    const label = when(photo);
                    const line =
                      isOver && !refused && drop.index === index
                        ? 'before'
                        : isOver && !refused && drop.index === group.length && index === group.length - 1
                          ? 'after'
                          : undefined;
                    return (
                      <li
                        key={id}
                        data-photo={id}
                        className="af-sort-item af-page-photo"
                        data-sel={isSelected || undefined}
                        data-dragging={dragId === id || undefined}
                        data-line={line}
                      >
                        <button
                          type="button"
                          className="af-sort-hit"
                          draggable
                          aria-pressed={isSelected}
                          aria-label={
                            selected && !isSelected
                              ? t.moveBeforeAria(name)
                              : t.orderPhotoAria(running, name, label, isSelected)
                          }
                          onClick={() => pick(id, groupIndex, index)}
                          onKeyDown={(event) => onArrow(event, id, groupIndex, index)}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData(DND_TYPE, id);
                            setDragId(id);
                            setSelectedId(null);
                          }}
                          onDragEnd={endDrag}
                        >
                          <span className="af-sort-print">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.previewUrl} alt="" draggable={false} loading="lazy" />
                          </span>
                          <span aria-hidden className="af-sort-meta">
                            <span className="af-sort-n">{String(running).padStart(2, '0')}</span>
                            <span className="af-sort-when">{label}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="af-slot-x af-sort-x"
                          aria-label={t.removeAria(name)}
                          onClick={() => {
                            setSelectedId(null);
                            onRemove(id);
                          }}
                        >
                          <IconX size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {/* Sem arraste: com uma foto escolhida, cada página com vaga
                    oferece "pôr no fim desta". */}
                {selected && !full && groupOf(selected) !== groupIndex && (
                  <button
                    type="button"
                    className="af-page-append"
                    aria-label={t.appendToPageAria(groupIndex + 1)}
                    onClick={() => commit({ group: groupIndex, index: group.length })}
                  >
                    <IconPlus size={14} />
                  </button>
                )}
              </li>
            );
          })}

          <li
            className="af-page-col af-page-new"
            data-over={drop?.group === groups.length || undefined}
            onDragOver={(event) => {
              if (!isOrderDrag(event) || !dragId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (drop?.group !== groups.length) setDrop({ group: groups.length, index: 0 });
            }}
            onDragLeave={(event) => {
              const next = event.relatedTarget as Node | null;
              if (!next || !event.currentTarget.contains(next)) {
                setDrop((current) => (current?.group === groups.length ? null : current));
              }
            }}
            onDrop={(event) => {
              if (!isOrderDrag(event)) return;
              event.preventDefault();
              commit({ group: groups.length, index: 0 });
            }}
          >
            <button
              type="button"
              className="af-page-new-hit"
              disabled={!selected}
              aria-label={t.newPageAria}
              onClick={() => commit({ group: groups.length, index: 0 })}
            >
              <IconPlus size={18} />
              <span className="af-page-new-title">{t.newPageColumn}</span>
              <span className="af-page-new-hint">{t.newPageHint}</span>
            </button>
          </li>
        </ol>
      )}

      {outside.length > 0 && (
        <div className="af-out">
          <div className="af-out-head">
            <span className="af-out-title">{t.outTitle}</span>
            <span className="af-help">{t.outHelp}</span>
          </div>
          <ul className="af-out-list">
            {outside.map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="af-out-item"
                  aria-label={t.restoreAria(photoName(photo))}
                  onClick={() => onRestore(photo.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.previewUrl} alt="" draggable={false} loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * As ordenações padrão, no canto da área: um botão com a escolhida e um menu
 * curto. "Aleatório" embaralha de novo a cada escolha.
 */
function SortMenu({ mode, onSort }: { mode: SortMode; onSort: (mode: SortMode) => void }) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="af-sortmenu" ref={rootRef}>
      <button
        type="button"
        className="af-sortmenu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
        </svg>
        <span className="af-sortmenu-label">{t.sortLabel}:</span>
        <span className="af-sortmenu-value">{t.sortShort[mode]}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="af-sortmenu-list">
          {SORT_MODES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option}
              className="af-sortmenu-item"
              onClick={() => {
                onSort(option);
                setOpen(false);
              }}
            >
              <span>{t.sortLong[option]}</span>
              {mode === option && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
