'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLang } from '@/features/i18n/LangProvider';
import { SPEC, fileSize, PAPERS } from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
import type {
  CoverElement,
  EditorAlbum,
  PageTextBlock,
  PhotoFrame,
} from '@/types/album-editor';
import { resetFraming } from '@/types/album-editor';
import type { PaperId } from '@/features/album-print/spec';
import type { Photo } from '@/types/photo';

import { Book3D } from './Book3D';
import { CoverInspector } from './CoverInspector';
import { CoverWrap, type SnapState } from './CoverWrap';
import { EDITOR_COPY } from './copy';
import { Group, Row, Seg, useTrackDrag } from './controls';
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconGrid,
  IconLayers,
  IconPlus,
  IconRuler,
  IconTrash,
  IconType,
} from './icons';
import { SheetPreview } from './PageView';
import { PagesInspector } from './PagesInspector';
import type { PhotoResolver } from './PageContent';
import { SheetStage } from './SheetStage';
import { useSheetTurn } from './useSheetTurn';
import { useStageZoom } from './useStageZoom';
import { ZoomControls } from './ZoomControls';
import { accentFor, colorById } from './palette';
import { clamp } from './useDrag';
import { useEditorAlbum } from './useEditorAlbum';

type View = 'cover' | 'pages' | 'book' | 'grid';

/** A ordem do trilho das abas — é ela que o arraste percorre. */
const TAB_IDS: View[] = ['cover', 'pages', 'book', 'grid'];

export interface AlbumEditorProps {
  /** Acervo: fotos já importadas, com EXIF lido e em ordem cronológica. */
  photos: Photo[];
  /** Nome do álbum, controlado por fora (é ele que vai para a nuvem). */
  name: string;
  onName: (name: string) => void;
  onUpload: (files: File[]) => void;
  /** Composição carregada do banco, quando existe. */
  initialAlbum?: EditorAlbum;
  onChange?: (album: EditorAlbum) => void;
  onExport?: (album: EditorAlbum) => void;
  /** Ações do produto (salvar na nuvem, compartilhar) montadas pela página. */
  actions?: React.ReactNode;
}

/**
 * O editor do álbum: capa, miolo, livro e grade numa tela só.
 *
 * Ele substituiu o `album-book/`, que derivava as páginas da ordem da lista de
 * fotos. Aqui a composição é explícita — cada quadro guarda o id da foto — o
 * que era a única forma de sustentar capa editável, lombada e área segura em
 * milímetros. A ordem cronológica não sumiu: ela é o **estado inicial**
 * (`fillChronologically`), e continua sendo o que o usuário vê antes de mexer
 * em qualquer coisa.
 */
export function AlbumEditor({
  photos,
  name,
  onName,
  onUpload,
  initialAlbum,
  onChange,
  onExport,
  actions,
}: AlbumEditorProps) {
  const { lang } = useLang();
  const copy = EDITOR_COPY[lang];

  const state = useEditorAlbum(initialAlbum);
  const {
    album,
    patch,
    spine,
    sheets,
    updateFrame,
    addSheet,
    removeSheet,
    minPages,
    fillChronologically,
  } = state;

  const [view, setView] = useState<View>('pages');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapState>({ x: false, y: false });
  const [guides, setGuides] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  /** Escala de encaixe: quanto o álbum precisa medir para caber na bancada. */
  const [fitPpm, setFitPpm] = useState(1.7);

  const tabsRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoom = useStageZoom(stageRef);

  /* O zoom multiplica o encaixe em vez de substituí-lo: assim "100%" quer
     dizer "o álbum inteiro na tela" em qualquer janela, e mudar o tamanho da
     janela não perde a aproximação escolhida. */
  const ppm = fitPpm * zoom.zoom;

  const color = colorById(album.color);
  const accent = accentFor(color);

  /* O nome do álbum é o texto do título da capa — e, por tabela, da lombada. */
  const titleElement = album.elements.find(
    (element) => element.kind === 'text' && element.role === 'title',
  );

  useEffect(() => {
    if (!titleElement || titleElement.kind !== 'text') return;
    if (titleElement.text === name) return;
    state.updateElement(titleElement.id, { text: name });
    // `state.updateElement` é estável (useCallback sem dependências).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, titleElement?.id]);

  /* Fotos recém-importadas caem nas páginas em ordem, sem desmanchar nada. */
  useEffect(() => {
    if (photos.length === 0) return;
    fillChronologically(photos);
  }, [photos, fillChronologically]);

  useEffect(() => {
    onChange?.(album);
  }, [album, onChange]);

  /* ── escala do palco: o álbum sempre cabe na área disponível ──────────── */
  /* A medida sai do **visor**, não do palco: o palco rola, e uma barra de
     rolagem que aparece encolhe a medida, que encolhe o álbum, que faz a barra
     sumir — vai e volta enquanto a janela estiver perto do limite. O visor não
     rola nunca, então mede o mesmo com zoom e sem. */
  useEffect(() => {
    const fit = () => {
      const node = viewportRef.current;
      const stage = stageRef.current;
      if (!node || !stage) return;

      const box = getComputedStyle(stage);
      const padX = parseFloat(box.paddingLeft) + parseFloat(box.paddingRight);
      const padY = parseFloat(box.paddingTop) + parseFloat(box.paddingBottom);
      const availableW = node.clientWidth - padX;
      const availableH = node.clientHeight - padY;
      const bleed = SPEC.bleed * 2;

      let needW: number;
      let needH = SPEC.trim.h + bleed;

      if (view === 'cover') needW = SPEC.trim.w * 2 + spine + bleed;
      else if (view === 'pages') needW = (SPEC.trim.w + bleed) * 2;
      else if (view === 'book') {
        // A caixa do livro é pouco maior que o próprio livro: na pose de
        // repouso ele projeta ~90% da largura da capa, e a folga que sobra é
        // para a sombra no chão. Com 1,5× ele virava um selo no meio da mesa.
        needW = SPEC.trim.w * 1.34;
        needH = SPEC.trim.h * 1.3;
      } else return;

      // Teto e piso da escala: sem eles o álbum vira um selo numa tela larga
      // ou estoura o palco numa estreita.
      setFitPpm(clamp(Math.min(availableW / needW, availableH / needH), 0.45, 3));
    };

    fit();
    const observer = new ResizeObserver(fit);
    const node = viewportRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [view, spine]);

  /* ── teclado: ajuste fino, desselecionar, remover ─────────────────────── */
  const selectedElement: CoverElement | null =
    album.elements.find((element) => element.id === selectedId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches?.('input, textarea, select')) return;

      if (event.key === 'Escape') {
        setSelectedId(null);
        setSelectedTextId(null);
        return;
      }
      if (!selectedElement) return;

      const step = event.shiftKey ? 4 : 0.6;
      const moves: Record<string, ['x' | 'y', number]> = {
        ArrowLeft: ['x', -1],
        ArrowRight: ['x', 1],
        ArrowUp: ['y', -1],
        ArrowDown: ['y', 1],
      };

      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        const [axis, direction] = move;
        state.updateElement(selectedElement.id, {
          [axis]: Math.round((selectedElement[axis] + direction * step) * 100) / 100,
        });
      }

      const removable =
        !(selectedElement.kind === 'text' && selectedElement.role === 'title');
      if ((event.key === 'Delete' || event.key === 'Backspace') && removable) {
        event.preventDefault();
        state.removeElement(selectedElement.id);
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement]);

  /* ── fotos ────────────────────────────────────────────────────────────── */
  const photoUrls = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo.previewUrl])),
    [photos],
  );
  const resolve = useCallback<PhotoResolver>(
    (photoId) => (photoId ? photoUrls.get(photoId) ?? null : null),
    [photoUrls],
  );

  /* ── folha corrente ───────────────────────────────────────────────────── */
  const safeSheet = clamp(sheetIndex, 0, Math.max(0, sheets.length - 1));
  const [leftIndex, rightIndex] = sheets[safeSheet] ?? [0, 1];
  const leftPage = album.pages[leftIndex];
  const rightPage = album.pages[rightIndex];

  const turn = useSheetTurn(sheets.length, safeSheet, setSheetIndex);

  const onFrame = (pageIndex: number, slot: number, changes: Partial<PhotoFrame>) =>
    updateFrame(pageIndex, slot, changes);

  const onDropPhoto = (pageIndex: number, slot: number, photoId: string) => {
    setSelectedSlot(slot);
    // A foto troca; o encaixe escolhido para aquele quadro fica.
    const fit = album.pages[pageIndex]?.slots[slot]?.fit ?? 'cover';
    updateFrame(pageIndex, slot, { photoId, ...resetFraming(fit) });
  };

  const onTextChange = (
    pageIndex: number,
    id: string,
    changes: Partial<PageTextBlock>,
  ) => state.updateTextBlock(pageIndex, id, changes);

  const onSelectText = (pageIndex: number, id: string | null) => {
    setActiveSide(pageIndex === leftIndex ? 'left' : 'right');
    setSelectedTextId(id);
  };

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'cover', label: copy.tabCover, icon: <IconType size={13} /> },
    { id: 'pages', label: copy.tabPages, icon: <IconLayers size={13} /> },
    { id: 'book', label: copy.tabBook, icon: <IconBook size={13} /> },
    { id: 'grid', label: copy.tabGrid, icon: <IconGrid size={13} /> },
  ];

  /* As abas são um interruptor: segurar e arrastar passeia por elas e solta na
     mais próxima. O clique direto numa aba continua valendo. */
  const pickTab = useCallback((next: number) => setView(TAB_IDS[next]), []);
  const tabTrack = useTrackDrag(
    tabsRef,
    TAB_IDS.length,
    Math.max(0, TAB_IDS.indexOf(view)),
    pickTab,
  );

  const file = fileSize(album.orientation);

  return (
    <div className="ae" style={{ '--ae-accent': accent } as React.CSSProperties}>
      <div className="ae-top">
        <div className="ae-brand">
          <span
            className="ae-dot"
            aria-hidden
            style={{ background: color.bg, boxShadow: `inset -3px 0 0 ${color.ink}` }}
          />
          <input
            className="ae-name"
            value={name}
            aria-label={copy.albumNameAria}
            placeholder={copy.albumNamePlaceholder}
            onChange={(event) => onName(event.target.value)}
          />
        </div>

        {/* Uma folga de cada lado das abas: elas ficam no meio da barra
            independente do que a marca à esquerda e as ações à direita
            carregam. Com folga só de um lado, elas colavam na marca e a barra
            ficava pesada à esquerda. */}
        <span className="ae-spacer" />

        <div
          className={`ae-tabs${tabTrack.dragging ? ' is-dragging' : ''}`}
          ref={tabsRef}
          role="group"
          aria-label={copy.views}
          onPointerDown={tabTrack.onPointerDown}
          onKeyDown={tabTrack.onKeyDown}
        >
          <span className="ae-tab-knob" aria-hidden style={tabTrack.knobStyle} />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={view === tab.id ? 'is-on' : ''}
              aria-pressed={view === tab.id}
              /* Numa bancada estreita o rótulo some e sobra o ícone — sem isto
                 o botão fica sem nome para o leitor de tela e sem dica para o
                 ponteiro. */
              aria-label={tab.label}
              title={tab.label}
              onClick={() => setView(tab.id)}
            >
              {tab.icon}
              <span className="ae-tab-text">{tab.label}</span>
            </button>
          ))}
        </div>

        <span className="ae-spacer" />
        <span className="ae-meta ae-meta-top">
          {copy.meta(formatMm(spine, 2), album.pages.length)}
        </span>

        <div className="ae-actions">
          <button
            type="button"
            className={`ae-btn${guides ? ' is-on' : ''}`}
            aria-pressed={guides}
            title={copy.guidesTip}
            onClick={() => setGuides((value) => !value)}
          >
            <IconRuler size={13} /> <span className="ae-btn-text">{copy.guides}</span>
          </button>

          {actions}

          {onExport && (
            <button
              type="button"
              className="ae-btn is-primary"
              aria-label={copy.export}
              title={copy.export}
              onClick={() => onExport(album)}
            >
              <IconDownload size={13} /> <span className="ae-btn-text">{copy.export}</span>
            </button>
          )}
        </div>
      </div>

      <div className="ae-body">
        <div className="ae-main">
          {/* O visor não rola; o palco dentro dele rola. É essa divisão que
              deixa o controle de escala parado no canto enquanto o álbum
              ampliado corre por baixo. */}
          <div className="ae-viewport" ref={viewportRef}>
            <div className="ae-stage" ref={stageRef}>
              {view === 'cover' && (
                <CoverWrap
                  album={album}
                  spine={spine}
                  ppm={ppm}
                  guides={guides}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={state.updateElement}
                  snap={snap}
                  setSnap={setSnap}
                />
              )}

              {view === 'book' && (
                <Book3D album={album} spine={spine} ppm={ppm} hint={copy.orbitHint} />
              )}

              {view === 'pages' && leftPage && rightPage && (
                <SheetStage
                  album={album}
                  sheets={sheets}
                  sheetIndex={safeSheet}
                  turn={turn}
                  ppm={ppm}
                  guides={guides}
                  ink={color.ink}
                  resolve={resolve}
                  activeSide={activeSide}
                  onActiveSide={setActiveSide}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  onFrame={onFrame}
                  onDropPhoto={onDropPhoto}
                  selectedTextId={selectedTextId}
                  onSelectText={onSelectText}
                  onTextChange={onTextChange}
                  hideNumber={!album.showPageNumbers}
                  hint={copy.flipHint}
                />
              )}

              {view === 'grid' && (
                <div className="ae-grid">
                  {sheets.map(([a, b], index) => (
                    /* A lixeira é **irmã** do botão que abre a folha, nunca
                       filha: botão dentro de botão não é HTML válido, e o
                       clique de dentro nunca chegaria inteiro ao lugar certo. */
                    <div className="ae-grid-item" key={album.pages[a].id}>
                      <button
                        type="button"
                        style={{ display: 'block', textAlign: 'left', width: '100%' }}
                        onClick={() => {
                          setSheetIndex(index);
                          setView('pages');
                        }}
                      >
                        <span
                          className={`ae-grid-cell${safeSheet === index ? ' is-on' : ''}`}
                          style={{
                            display: 'block',
                            aspectRatio: `${SPEC.trim.w * 2} / ${SPEC.trim.h}`,
                          }}
                        >
                          <SheetPreview
                            pages={album.pages}
                            left={a}
                            right={b}
                            ink={color.ink}
                            ppm={0.72}
                            resolve={resolve}
                          />
                        </span>
                        <span className="ae-meta" style={{ display: 'block', marginTop: 6 }}>
                          {a + 1}–{b + 1}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="ae-sheet-del"
                        aria-label={copy.removeSheet}
                        title={copy.removeSheet}
                        disabled={album.pages.length <= minPages}
                        onClick={() => removeSheet(a)}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="ae-grid-add"
                    style={{ aspectRatio: `${SPEC.trim.w * 2} / ${SPEC.trim.h}` }}
                    onClick={addSheet}
                  >
                    <IconPlus size={18} />
                    <span style={{ fontSize: 11.5 }}>{copy.newSheet}</span>
                  </button>
                </div>
              )}
            </div>
            {/* A grade não tem escala própria — as miniaturas dela são de
                tamanho fixo. Um controle que não muda nada é pior que a
                ausência dele. */}
            {view !== 'grid' && <ZoomControls zoom={zoom} copy={copy} />}
          </div>

          {(view === 'pages' || view === 'grid') && (
            <div className="ae-strip">
              <button
                type="button"
                className="ae-btn is-icon"
                aria-label={copy.prevSheet}
                disabled={safeSheet === 0}
                onClick={() => turn.go('prev')}
              >
                <IconChevronLeft size={14} />
              </button>

              {sheets.map(([a, b], index) => (
                <span className="ae-thumb-wrap" key={album.pages[a].id}>
                  <button
                    type="button"
                    className={`ae-thumb${safeSheet === index ? ' is-on' : ''}`}
                    aria-pressed={safeSheet === index}
                    aria-label={copy.sheetRange(a + 1, b + 1)}
                    onClick={() => setSheetIndex(index)}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        inset: '0 0 11px 0',
                        overflow: 'hidden',
                        display: 'block',
                      }}
                    >
                      <SheetPreview
                        pages={album.pages}
                        left={a}
                        right={b}
                        ink={color.ink}
                        ppm={0.2}
                        resolve={resolve}
                      />
                    </span>
                    <span className="ae-thumb-label">
                      {a + 1}–{b + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ae-sheet-del"
                    aria-label={copy.removeSheet}
                    title={copy.removeSheet}
                    disabled={album.pages.length <= minPages}
                    onClick={() => removeSheet(a)}
                  >
                    <IconTrash size={12} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="ae-btn is-icon"
                aria-label={copy.newSheet}
                onClick={addSheet}
              >
                <IconPlus size={14} />
              </button>
              <button
                type="button"
                className="ae-btn is-icon"
                aria-label={copy.nextSheet}
                disabled={safeSheet >= sheets.length - 1}
                onClick={() => turn.go('next')}
              >
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <aside className="ae-inspector">
          {(view === 'cover' || view === 'book') && (
            <CoverInspector
              state={state}
              copy={copy}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          {(view === 'pages' || view === 'grid') && (
            <PagesInspector
              state={state}
              copy={copy}
              photos={photos}
              leftIndex={leftIndex}
              rightIndex={rightIndex}
              activeSide={activeSide}
              onActiveSide={setActiveSide}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onUpload={onUpload}
            />
          )}

          <Group title={copy.printGroup}>
            {/* O número da página é ajuste do álbum inteiro, não da folha: uma
                numeração que existe em metade do livro não é numeração. */}
            <Row label={copy.pageNumbers} hint={copy.pageNumbersHint} stack>
              <Seg<boolean>
                full
                label={copy.pageNumbers}
                value={album.showPageNumbers}
                onChange={(showPageNumbers) => patch({ showPageNumbers })}
                options={[
                  { value: true, label: copy.yes },
                  { value: false, label: copy.no },
                ]}
              />
            </Row>
            <Row label={copy.fieldPaper}>
              <select
                className="ae-input"
                aria-label={copy.fieldPaper}
                value={album.paper}
                onChange={(event) => patch({ paper: event.target.value as PaperId })}
              >
                {PAPERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {copy[option.labelKey as keyof typeof copy] as string}
                  </option>
                ))}
              </select>
            </Row>
            <p className="ae-note">
              {copy.printNote({
                trimW: SPEC.trim.w,
                trimH: SPEC.trim.h,
                bleed: SPEC.bleed,
                fileW: file.w,
                fileH: file.h,
                safeOuter: SPEC.safe.outer,
                safeSpine: SPEC.safe.spine,
                glue: SPEC.glue,
                hinge: SPEC.hinge,
              })}
            </p>
          </Group>
        </aside>
      </div>
    </div>
  );
}
