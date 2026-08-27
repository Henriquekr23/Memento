'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SPEC } from '@/features/album-print/spec';
import { Book3D } from '@/features/album-editor/Book3D';
import { PageView } from '@/features/album-editor/PageView';
import type { PhotoResolver } from '@/features/album-editor/PageContent';
import { accentFor, colorById } from '@/features/album-editor/palette';
import { EDITOR_COPY } from '@/features/album-editor/copy';
import { clamp } from '@/features/album-editor/useDrag';
import { useLang } from '@/features/i18n/LangProvider';
import { IconBook, IconChevronLeft, IconChevronRight, IconLayers } from '@/features/album-editor/icons';
import type { AlbumComposition } from '@/features/album-save/composition';
import { paperById, spineWidth } from '@/features/album-print/spec';
import type { Photo } from '@/types/photo';

/**
 * O álbum salvo, só para ler.
 *
 * É o **mesmo desenho** da tela de edição — as mesmas páginas, a mesma capa, a
 * mesma lombada —, com as alças e o inspetor fora. Reaproveitar em vez de fazer
 * uma galeria simples não é economia de código: o objeto *é* o produto; uma
 * grade de imagens seria outro produto com o mesmo conteúdo.
 */
export function AlbumViewer({
  title,
  photos,
  composition,
}: {
  title: string;
  photos: Photo[];
  composition: AlbumComposition;
}) {
  const { lang } = useLang();
  const copy = EDITOR_COPY[lang];
  const album = composition.album;

  const [view, setView] = useState<'book' | 'pages'>('book');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [ppm, setPpm] = useState(1.2);
  const stageRef = useRef<HTMLDivElement>(null);

  const color = colorById(album.color);
  const spine = album.spine.mm ?? spineWidth(album.pages.length, paperById(album.paper).mm);

  const photoUrls = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo.previewUrl])),
    [photos],
  );
  const resolve = useCallback<PhotoResolver>(
    (photoId) => (photoId ? photoUrls.get(photoId) ?? null : null),
    [photoUrls],
  );

  const sheets = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < album.pages.length; i += 2) out.push([i, i + 1]);
    return out;
  }, [album.pages.length]);

  const safeSheet = clamp(sheetIndex, 0, Math.max(0, sheets.length - 1));
  const [leftIndex, rightIndex] = sheets[safeSheet] ?? [0, 1];

  useEffect(() => {
    const fit = () => {
      const node = stageRef.current;
      if (!node) return;
      const availableW = node.clientWidth - 32;
      const availableH = node.clientHeight - 32;
      const bleed = SPEC.bleed * 2;
      const needW = view === 'pages' ? (SPEC.trim.w + bleed) * 2 : SPEC.trim.w * 1.5;
      const needH = view === 'pages' ? SPEC.trim.h + bleed : SPEC.trim.h * 1.35;
      setPpm(clamp(Math.min(availableW / needW, availableH / needH), 0.3, 4));
    };
    fit();
    const observer = new ResizeObserver(fit);
    const node = stageRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== 'pages') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setSheetIndex((i) => clamp(i + 1, 0, sheets.length - 1));
      if (event.key === 'ArrowLeft') setSheetIndex((i) => clamp(i - 1, 0, sheets.length - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, sheets.length]);

  const named = { ...album, name: album.name || title };

  return (
    <div className="ae" style={{ '--ae-accent': accentFor(color) } as React.CSSProperties}>
      <div className="ae-top">
        <div className="ae-tabs">
          <button
            type="button"
            className={view === 'book' ? 'is-on' : ''}
            onClick={() => setView('book')}
          >
            <IconBook size={13} /> {copy.tabBook}
          </button>
          <button
            type="button"
            className={view === 'pages' ? 'is-on' : ''}
            onClick={() => setView('pages')}
          >
            <IconLayers size={13} /> {copy.tabPages}
          </button>
        </div>
        <span className="ae-spacer" />
        {view === 'pages' && (
          <span className="ae-meta">{copy.sheetRange(leftIndex + 1, rightIndex + 1)}</span>
        )}
      </div>

      <div className="ae-main">
        <div className="ae-stage" ref={stageRef}>
          {view === 'book' ? (
            <Book3D album={named} spine={spine} ppm={ppm} hint={copy.orbitHint} />
          ) : (
            <div className="ae-sheet">
              {([['left', leftIndex], ['right', rightIndex]] as const).map(([hand, index]) => {
                const page = album.pages[index];
                if (!page) return null;
                return (
                  <span
                    key={page.id}
                    style={{
                      display: 'block',
                      position: 'relative',
                      marginLeft: hand === 'right' ? -SPEC.bleed * 2 * ppm : 0,
                    }}
                  >
                    <PageView
                      page={page}
                      index={index}
                      ppm={ppm}
                      hand={hand}
                      guides={false}
                      ink={color.ink}
                      resolve={resolve}
                    />
                  </span>
                );
              })}
              <div className="ae-gutter" />
            </div>
          )}
        </div>

        {view === 'pages' && (
          <div className="ae-strip" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="ae-btn"
              style={{ padding: 7 }}
              aria-label={copy.prevSheet}
              disabled={safeSheet === 0}
              onClick={() => setSheetIndex((i) => clamp(i - 1, 0, sheets.length - 1))}
            >
              <IconChevronLeft size={14} />
            </button>
            <span className="ae-meta">
              {safeSheet + 1} / {sheets.length}
            </span>
            <button
              type="button"
              className="ae-btn"
              style={{ padding: 7 }}
              aria-label={copy.nextSheet}
              disabled={safeSheet >= sheets.length - 1}
              onClick={() => setSheetIndex((i) => clamp(i + 1, 0, sheets.length - 1))}
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
