'use client';

import { useEffect, useState } from 'react';

import type { BoardApi, FrameRef } from '@/features/album-editor/AlbumEditor';
import { IconPlus, IconTrash, IconX } from '@/features/album-editor/icons';
import { PHOTO_DND_TYPE } from '@/features/album-editor/PageContent';
import { useLang } from '@/features/i18n/LangProvider';
import { layoutById, type EditorPage } from '@/types/album-editor';

import { FLOW_COPY } from './copy';
import { toSpreads } from './paginate';

/** O quadro de onde saiu o arraste, para saber que é troca e não bandeja. */
const FRAME_DND_TYPE = 'text/memento-frame';

function frameKey(frame: FrameRef): string {
  return `${frame.page}:${frame.slot}`;
}

function readFrame(value: string): FrameRef | null {
  const [page, slot] = value.split(':').map(Number);
  return Number.isInteger(page) && Number.isInteger(slot) ? { page, slot } : null;
}

function isPhotoDrag(event: React.DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes(FRAME_DND_TYPE) || types.includes(PHOTO_DND_TYPE);
}

/**
 * A visão geral das páginas da etapa 3: todas as aberturas, numeradas, lendo e
 * escrevendo a **mesma** composição do editor (`BoardApi`). Ao lado fica o
 * inspetor de páginas do editor, que edita a página escolhida aqui — tipo de
 * página (foto, duas, três, quatro, texto…), foto até a borda ou com margem,
 * respiro, texto. Dois cliques (ou "Ajustar") abrem a folha para o
 * enquadramento e o zoom de cada foto.
 *
 * Mover é **soltar em cima**: o quadro inteiro é o alvo, e soltar troca o
 * conteúdo dos dois (se o de destino estiver vazio, a foto só muda de lugar).
 * Foto vinda da bandeja do inspetor ocupa o quadro onde cair. No toque e no
 * teclado: escolher a foto, depois o quadro de destino.
 */
export function PagesOverview({ api }: { api: BoardApi }) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const { album, resolve, activePage } = api;
  const [picked, setPicked] = useState<FrameRef | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    if (!picked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPicked(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [picked]);

  const pages = album.pages.map((page, index) => ({ page, index }));
  const spreads = toSpreads(pages);

  const drop = (to: FrameRef, event: React.DragEvent) => {
    if (!isPhotoDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(null);
    setDragFrom(null);
    const from = readFrame(event.dataTransfer.getData(FRAME_DND_TYPE));
    if (from) {
      api.onSwapFrames(from, to);
      return;
    }
    const photoId = event.dataTransfer.getData(PHOTO_DND_TYPE);
    if (photoId) api.onPlacePhoto(to, photoId);
  };

  const pickFrame = (frame: FrameRef, hasPhoto: boolean) => {
    if (picked) {
      if (frameKey(picked) !== frameKey(frame)) api.onSwapFrames(picked, frame);
      setPicked(null);
      return;
    }
    api.onSelectPage(frame.page);
    if (hasPhoto) setPicked(frame);
  };

  const renderPage = ({ page, index }: { page: EditorPage; index: number }) => {
    const capacity = layoutById(page.layout).slots;
    const isActive = index === activePage;
    return (
      <div className="af-board-page-wrap" key={page.id}>
        <div
          className="af-board-page"
          data-layout={page.layout}
          data-fill={page.fill || undefined}
          data-active={isActive || undefined}
          role="group"
          aria-label={t.pageAria(index + 1)}
          onClick={(event) => {
            if (event.target === event.currentTarget) api.onSelectPage(index);
          }}
          onDoubleClick={() => api.onOpenPage(index)}
        >
          {capacity === 0 ? (
            <button
              type="button"
              className="af-board-text"
              onClick={() => api.onSelectPage(index)}
            >
              <span>{pageText(page) || t.textPage}</span>
            </button>
          ) : (
            page.slots.slice(0, capacity).map((frame, slot) => {
              const ref = { page: index, slot };
              const key = frameKey(ref);
              const src = resolve(frame.photoId);
              const isPicked = picked !== null && frameKey(picked) === key;
              return (
                <div
                  key={key}
                  className={`af-board-frame${src ? '' : ' is-empty'}`}
                  data-over={(over === key && dragFrom !== key) || undefined}
                  data-sel={isPicked || undefined}
                  onDragOver={(event) => {
                    if (!isPhotoDrag(event)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    if (over !== key) setOver(key);
                  }}
                  onDragLeave={(event) => {
                    const next = event.relatedTarget as Node | null;
                    if (!next || !event.currentTarget.contains(next)) {
                      setOver((current) => (current === key ? null : current));
                    }
                  }}
                  onDrop={(event) => drop(ref, event)}
                >
                  <button
                    type="button"
                    className="af-board-hit"
                    draggable={!!src}
                    aria-pressed={isPicked}
                    aria-label={
                      src
                        ? t.boardPhotoAria(index + 1, slot + 1, !!picked && !isPicked)
                        : t.boardEmptyAria(index + 1, slot + 1)
                    }
                    onClick={() => pickFrame(ref, !!src)}
                    onDragStart={(event) => {
                      if (!frame.photoId) return;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData(FRAME_DND_TYPE, key);
                      event.dataTransfer.setData(PHOTO_DND_TYPE, frame.photoId);
                      setDragFrom(key);
                      setPicked(null);
                    }}
                    onDragEnd={() => {
                      setDragFrom(null);
                      setOver(null);
                    }}
                  >
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" draggable={false} loading="lazy" />
                    )}
                  </button>
                  {src && (
                    <button
                      type="button"
                      className="af-slot-x af-board-x"
                      aria-label={t.boardClearAria(index + 1, slot + 1)}
                      onClick={() => {
                        setPicked(null);
                        api.onClearFrame(ref);
                      }}
                    >
                      <IconX size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="af-board-page-foot">
          <span className="af-board-num">{index + 1}</span>
          {isActive && (
            <button type="button" className="af-board-open" onClick={() => api.onOpenPage(index)}>
              {t.openPage}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="af-board" data-picking={picked ? true : undefined}>
      <div className="af-board-spreads">
        {spreads.map(([left, right], spreadIndex) => (
          <div className="af-board-spread-wrap" key={left.page.id}>
            <div
              className="af-board-spread"
              role="group"
              aria-label={t.spreadAria(spreadIndex * 2 + 1, spreadIndex * 2 + 2)}
            >
              {renderPage(left)}
              {right && renderPage(right)}
            </div>
            <button
              type="button"
              className="af-board-del"
              aria-label={t.removeSpreadAria(spreadIndex * 2 + 1, spreadIndex * 2 + 2)}
              title={t.removeSpreadAria(spreadIndex * 2 + 1, spreadIndex * 2 + 2)}
              disabled={!api.canRemoveSheet}
              onClick={() => api.onRemoveSheet(left.index)}
            >
              <IconTrash size={13} />
            </button>
          </div>
        ))}
        <button type="button" className="af-board-add" onClick={api.onAddSheet}>
          <IconPlus size={18} />
          <span>{t.addSpread}</span>
        </button>
      </div>
    </div>
  );
}

/** O texto que uma página de texto mostra na miniatura. */
function pageText(page: EditorPage): string {
  const fromBlocks = page.textBlocks.map((block) => block.text).find((text) => text.trim());
  return (page.heading || fromBlocks || page.body || '').trim();
}
