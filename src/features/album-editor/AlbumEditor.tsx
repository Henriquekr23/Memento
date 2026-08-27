'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLang } from '@/features/i18n/LangProvider';
import { SPEC, fileSize, PAPERS } from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
import type { CoverElement, EditorAlbum, PhotoFrame } from '@/types/album-editor';
import type { PaperId } from '@/features/album-print/spec';
import type { Photo } from '@/types/photo';

import { Book3D } from './Book3D';
import { CoverInspector } from './CoverInspector';
import { CoverWrap, type SnapState } from './CoverWrap';
import { EDITOR_COPY } from './copy';
import { Group, Row } from './controls';
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconGrid,
  IconLayers,
  IconPlus,
  IconRuler,
  IconType,
} from './icons';
import { SheetPreview } from './PageView';
import { PagesInspector } from './PagesInspector';
import type { PhotoResolver } from './PageContent';
import { SheetStage } from './SheetStage';
import { useSheetTurn } from './useSheetTurn';
import { accentFor, colorById } from './palette';
import { clamp } from './useDrag';
import { useEditorAlbum } from './useEditorAlbum';

type View = 'cover' | 'pages' | 'book' | 'grid';

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
  const { album, patch, spine, sheets, updateFrame, addSheet, fillChronologically } = state;

  const [view, setView] = useState<View>('pages');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapState>({ x: false, y: false });
  const [guides, setGuides] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  const [ppm, setPpm] = useState(1.7);

  const stageRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    const fit = () => {
      const node = stageRef.current;
      if (!node) return;
      const availableW = node.clientWidth - 56;
      const availableH = node.clientHeight - 56;
      const bleed = SPEC.bleed * 2;

      let needW: number;
      let needH = SPEC.trim.h + bleed;

      if (view === 'cover') needW = SPEC.trim.w * 2 + spine + bleed;
      else if (view === 'pages') needW = (SPEC.trim.w + bleed) * 2;
      else if (view === 'book') {
        needW = SPEC.trim.w * 1.5;
        needH = SPEC.trim.h * 1.35;
      } else return;

      // Teto e piso da escala: sem eles o álbum vira um selo numa tela larga
      // ou estoura o palco numa estreita.
      setPpm(clamp(Math.min(availableW / needW, availableH / needH), 0.45, 3));
    };

    fit();
    const observer = new ResizeObserver(fit);
    const node = stageRef.current;
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
    updateFrame(pageIndex, slot, { photoId, zoom: 1, offsetX: 0, offsetY: 0 });
  };

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'cover', label: copy.tabCover, icon: <IconType size={13} /> },
    { id: 'pages', label: copy.tabPages, icon: <IconLayers size={13} /> },
    { id: 'book', label: copy.tabBook, icon: <IconBook size={13} /> },
    { id: 'grid', label: copy.tabGrid, icon: <IconGrid size={13} /> },
  ];

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

        <div className="ae-tabs">
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
                hint={copy.flipHint}
              />
            )}

            {view === 'grid' && (
              <div className="ae-grid">
                {sheets.map(([a, b], index) => (
                  <button
                    key={album.pages[a].id}
                    type="button"
                    style={{ display: 'block', textAlign: 'left' }}
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
                <button
                  key={album.pages[a].id}
                  type="button"
                  className={`ae-thumb${safeSheet === index ? ' is-on' : ''}`}
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
              onUpload={onUpload}
            />
          )}

          <Group title={copy.printGroup}>
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
