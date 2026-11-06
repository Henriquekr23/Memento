'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { IconX } from '@/features/album-editor/icons';
import { isDated } from '@/features/album-builder/selection';
import { useLang } from '@/features/i18n/LangProvider';
import { useIsTouch } from '@/hooks/useMediaQuery';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import type { Side } from './order';
import { photoName } from './photoName';

/** Tipo de dado do arraste entre fotos desta fila. */
const DND_TYPE = 'text/memento-order';

function isOrderDrag(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(DND_TYPE);
}

/** Duração e curva da troca de lugar. */
const MOVE_MS = 460;
const MOVE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * As fotos deslizam até o lugar novo em vez de saltar (FLIP).
 *
 * A posição de cada foto é guardada depois de cada mudança de ordem; na
 * seguinte, quem andou nasce no lugar antigo (`translate`) e desliza até o
 * novo. `translate` é a propriedade separada, e não `transform`: o giro da foto
 * (`rotate`, no CSS) continua valendo durante a viagem. Posições são
 * `offsetLeft/Top` — não mudam com a rolagem nem com o `transform` do hover —,
 * e são medidas de novo quando a fila muda de largura.
 */
function useReorderMotion(listRef: React.RefObject<HTMLOListElement | null>, orderKey: string) {
  const positions = useRef(new Map<string, { x: number; y: number }>());

  const measure = (list: HTMLOListElement) => {
    const next = new Map<string, { x: number; y: number }>();
    list.querySelectorAll<HTMLElement>('[data-photo]').forEach((node) => {
      next.set(node.dataset.photo ?? '', { x: node.offsetLeft, y: node.offsetTop });
    });
    return next;
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const next = measure(list);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      list.querySelectorAll<HTMLElement>('[data-photo]').forEach((node) => {
        const before = positions.current.get(node.dataset.photo ?? '');
        const after = next.get(node.dataset.photo ?? '');
        if (!before || !after) return;
        const dx = before.x - after.x;
        const dy = before.y - after.y;
        if (dx === 0 && dy === 0) return;
        node.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
          duration: MOVE_MS,
          easing: MOVE_EASE,
        });
      });
    }
    positions.current = next;
  }, [listRef, orderKey]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      positions.current = measure(list);
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef]);
}

/**
 * Um giro pequeno e estável para cada foto, tirado do id: a fila parece fotos
 * soltas sobre a mesa, e a mesma foto gira sempre igual (não pula a cada
 * render nem quando muda de lugar).
 */
function tiltOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 7) - 3) * 0.6;
}

/**
 * Etapa 2: as fotos numa fila só, na ordem em que vão virar álbum.
 *
 * Sem páginas aqui — é só a sequência, como fotos espalhadas na mesa. Mexer é
 * **inserir** (`order.ts`): arrastar uma foto por cima de outra já a põe no
 * lugar dela, ao vivo, e as outras deslizam; tocar numa e depois onde ela
 * entra; ou Enter numa e as setas. O X tira do álbum; quem está fora aparece
 * embaixo, apagado, e volta com um toque.
 */
export function PhotoSorter({
  photos,
  outside,
  isManuallyOrdered,
  onMove,
  onRemove,
  onRestore,
  onSortByDate,
}: {
  /** Quem está no álbum, na ordem. */
  photos: readonly Photo[];
  /** Quem foi tirado. */
  outside: readonly Photo[];
  isManuallyOrdered: boolean;
  onMove: (id: string, targetId: string, side: Side) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onSortByDate: () => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const isTouch = useIsTouch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  /** A última foto que cedeu lugar no arraste: não cede de novo enquanto o
   *  ponteiro ainda estiver sobre ela (senão as duas ficariam trocando). */
  const lastTarget = useRef<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  useReorderMotion(listRef, photos.map((photo) => photo.id).join(','));

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

  const selected = selectedId && photos.some((photo) => photo.id === selectedId) ? selectedId : null;

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
      listRef.current?.querySelector<HTMLElement>(`[data-photo="${id}"] .af-sort-hit`)?.focus(),
    );

  const pick = (id: string, index: number) => {
    if (!selected) return setSelectedId(id);
    if (selected === id) return setSelectedId(null);
    const from = photos.findIndex((photo) => photo.id === selected);
    onMove(selected, id, from < index ? 'after' : 'before');
    setSelectedId(null);
  };

  const onArrow = (event: React.KeyboardEvent, id: string, index: number) => {
    if (selected !== id) return;
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const neighbor = photos[index + step];
    if (!neighbor) return;
    onMove(id, neighbor.id, step < 0 ? 'before' : 'after');
    focusPhoto(id);
  };

  return (
    <div className="af-sort" data-selecting={selected ? true : undefined}>
      <div className="af-sort-head">
        <div>
          <p className="af-mono af-muted">{t.inAlbum(photos.length)}</p>
          <p className="af-help">{isTouch ? t.orderHelpTouch : t.orderHelpPointer}</p>
        </div>
        {isManuallyOrdered && (
          <button type="button" className="af-btn af-btn-ghost af-btn-sm" onClick={onSortByDate}>
            {t.sortByDate}
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="af-help">{t.orderEmpty}</p>
      ) : (
        <ol
          ref={listRef}
          className="af-sort-list"
          // Soltar no vão entre as fotos também vale: a ordem já mudou no
          // caminho, e o navegador não precisa animar a foto "voltando".
          onDragOver={(event) => {
            if (isOrderDrag(event)) event.preventDefault();
          }}
          onDrop={(event) => {
            if (!isOrderDrag(event)) return;
            event.preventDefault();
            setDragId(null);
            lastTarget.current = null;
          }}
        >
          {photos.map((photo, index) => {
            const name = photoName(photo);
            const isSelected = selected === photo.id;
            const label = when(photo);
            return (
              <li
                key={photo.id}
                data-photo={photo.id}
                className="af-sort-item"
                data-sel={isSelected || undefined}
                data-dragging={dragId === photo.id || undefined}
                style={{ '--tilt': `${tiltOf(photo.id)}deg` } as React.CSSProperties}
                onDragOver={(event) => {
                  if (!isOrderDrag(event)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  // Basta passar por cima: a foto arrastada já toma o lugar
                  // desta, e as outras deslizam (`useReorderMotion`).
                  if (!dragId || photo.id === dragId) {
                    lastTarget.current = null;
                    return;
                  }
                  if (lastTarget.current === photo.id) return;
                  lastTarget.current = photo.id;
                  const from = photos.findIndex((item) => item.id === dragId);
                  onMove(dragId, photo.id, from < index ? 'after' : 'before');
                }}
                onDrop={(event) => {
                  if (!isOrderDrag(event)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setDragId(null);
                  lastTarget.current = null;
                }}
              >
                <button
                  type="button"
                  className="af-sort-hit"
                  draggable
                  aria-pressed={isSelected}
                  aria-label={
                    selected && !isSelected
                      ? t.moveBeforeAria(name)
                      : t.orderPhotoAria(index + 1, name, label, isSelected)
                  }
                  onClick={() => pick(photo.id, index)}
                  onKeyDown={(event) => onArrow(event, photo.id, index)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(DND_TYPE, photo.id);
                    setDragId(photo.id);
                    setSelectedId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    lastTarget.current = null;
                  }}
                >
                  <span className="af-sort-print">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt="" draggable={false} loading="lazy" />
                  </span>
                  <span aria-hidden className="af-sort-meta">
                    <span className="af-sort-n">{String(index + 1).padStart(2, '0')}</span>
                    <span className="af-sort-when">{label}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="af-slot-x af-sort-x"
                  aria-label={t.removeAria(name)}
                  onClick={() => {
                    setSelectedId(null);
                    onRemove(photo.id);
                  }}
                >
                  <IconX size={13} />
                </button>
              </li>
            );
          })}
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
