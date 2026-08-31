'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SPEC } from '@/features/album-print/spec';
import { Book3D } from '@/features/album-editor/Book3D';
import type { PhotoResolver } from '@/features/album-editor/PageContent';
import { SheetStage } from '@/features/album-editor/SheetStage';
import { useSheetTurn } from '@/features/album-editor/useSheetTurn';
import { accentFor, colorById } from '@/features/album-editor/palette';
import { EDITOR_COPY } from '@/features/album-editor/copy';
import { clamp } from '@/features/album-editor/useDrag';
import { useStageZoom } from '@/features/album-editor/useStageZoom';
import { ZoomControls } from '@/features/album-editor/ZoomControls';
import { useLang } from '@/features/i18n/LangProvider';
import { IconBook, IconLayers } from '@/features/album-editor/icons';
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
  const [fitPpm, setFitPpm] = useState(1.2);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoom = useStageZoom(stageRef);

  /* Mesma régua do editor: o zoom multiplica o encaixe, e 100% quer dizer "o
     álbum inteiro na tela" em qualquer janela. */
  const ppm = fitPpm * zoom.zoom;

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

  /* A mesma máquina de virar folha da bancada — e, com ela, o mesmo gesto:
     segurar a folha e arrastar. Ler o álbum de outra pessoa e montar o próprio
     têm que se sentir como o mesmo objeto. */
  const turn = useSheetTurn(sheets.length, safeSheet, setSheetIndex);
  const { go } = turn;

  useEffect(() => {
    const fit = () => {
      const node = viewportRef.current;
      const stage = stageRef.current;
      if (!node || !stage) return;
      // Medir o visor, e não o palco: o palco rola, e a barra de rolagem que
      // aparece com o zoom mudaria a medida do encaixe a cada aproximação.
      const box = getComputedStyle(stage);
      const padX = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight);
      const padY = parseFloat(box.paddingTop) + parseFloat(box.paddingBottom);
      const availableW = node.clientWidth - padX;
      const availableH = node.clientHeight - padY;
      const bleed = SPEC.bleed * 2;
      const needW = view === 'pages' ? (SPEC.trim.w + bleed) * 2 : SPEC.trim.w * 1.34;
      const needH = view === 'pages' ? SPEC.trim.h + bleed : SPEC.trim.h * 1.3;
      setFitPpm(clamp(Math.min(availableW / needW, availableH / needH), 0.3, 4));
    };
    fit();
    const observer = new ResizeObserver(fit);
    const node = viewportRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== 'pages') return;
    const onKey = (event: KeyboardEvent) => {
      // Pelo `turn`, e não direto no índice: a seta do teclado vira a folha
      // com a mesma animação do arraste, em vez de trocar a página num corte.
      if (event.key === 'ArrowRight') go('next');
      if (event.key === 'ArrowLeft') go('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, go]);

  const named = { ...album, name: album.name || title };

  return (
    <div className="ae is-read" style={{ '--ae-accent': accentFor(color) } as React.CSSProperties}>
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
        <div className="ae-viewport" ref={viewportRef}>
          <div className="ae-stage" ref={stageRef}>
            {view === 'book' ? (
              <Book3D album={named} spine={spine} ppm={ppm} hint={copy.orbitHint} />
            ) : (
              album.pages[leftIndex] &&
              album.pages[rightIndex] && (
                /* A mesma folha da bancada, só que sem alça nenhuma: em
                   `readOnly` a metade inteira pega o arraste de virar, porque
                   aqui não há enquadramento de foto para disputar o gesto. */
                <SheetStage
                  album={named}
                  sheets={sheets}
                  sheetIndex={safeSheet}
                  turn={turn}
                  ppm={ppm}
                  guides={false}
                  ink={color.ink}
                  resolve={resolve}
                  readOnly
                  hideNumber={!album.showPageNumbers}
                  hint={copy.flipHintRead}
                />
              )
            )}
          </div>
          <ZoomControls zoom={zoom} copy={copy} />
        </div>
      </div>
    </div>
  );
}
