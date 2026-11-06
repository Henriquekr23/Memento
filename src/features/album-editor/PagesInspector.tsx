'use client';

import { useState } from 'react';

import type { Photo } from '@/types/photo';
import {
  EDITOR_LAYOUTS,
  layoutById,
  makePresetTextBlock,
  resetFraming,
  type CoverFontId,
  type EditorLayoutId,
  type FrameFit,
  type TextAlign,
  type TextBackdrop,
  type TextBlockPreset,
} from '@/types/album-editor';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider, Switch } from './controls';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconTrash,
  IconX,
} from './icons';
import { LayoutIcon } from './LayoutIcon';
import { PHOTO_DND_TYPE, type PhotoResolver } from './PageContent';
import { COVER_FONTS, fontById } from './palette';

const LAYOUT_LABEL: Record<EditorLayoutId, keyof EditorCopy> = {
  full: 'layoutFull',
  inset: 'layoutInset',
  duoV: 'layoutDuoV',
  duoH: 'layoutDuoH',
  trio: 'layoutTrio',
  quad: 'layoutQuad',
  text: 'layoutText',
};

/** Três tintas, e não um seletor de cor: capa e miolo são de cor chapada. */
type InkChoice = 'ink' | 'white' | 'dark';
const INK_VALUE: Record<InkChoice, string | null> = {
  ink: null,
  white: '#FFFFFF',
  dark: '#141414',
};

function inkChoice(color: string | null): InkChoice {
  if (color === null) return 'ink';
  return color.toUpperCase() === '#FFFFFF' ? 'white' : 'dark';
}

interface PagesInspectorProps {
  state: EditorAlbumState;
  copy: EditorCopy;
  leftIndex: number;
  rightIndex: number;
  activeSide: 'left' | 'right';
  onActiveSide: (side: 'left' | 'right') => void;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  /**
   * Onde o inspetor está: na visão geral (`board`) a página é escolhida
   * clicando nela, então o seletor "Editando" da folha não tem o que fazer.
   */
  context: 'board' | 'sheet';
  /** Fotos do álbum — as que não estão em página nenhuma formam a bandeja. */
  photos: Photo[];
  resolve: PhotoResolver;
  /** Leva à página (seleciona e, na folha aberta, vira até ela). */
  onGoToPage: (pageIndex: number) => void;
}

/**
 * Controles da folha aberta, dos quadros e dos textos.
 *
 * A ordem é a da decisão: primeiro *qual página* estou editando, depois *como
 * ela é dividida*, depois *o que entra em cada quadro*, e por fim *o que está
 * escrito nela*. Os controles largos (segmentado, deslizante) ficam embaixo do
 * rótulo — numa lateral de 264 px um segmentado de duas casas partilhando a
 * linha com o rótulo fica estreito demais para virar alvo de arraste.
 */
export function PagesInspector({
  state,
  copy,
  leftIndex,
  rightIndex,
  activeSide,
  onActiveSide,
  selectedSlot,
  onSelectSlot,
  selectedTextId,
  onSelectText,
  context,
  photos,
  resolve,
  onGoToPage,
}: PagesInspectorProps) {
  const {
    album,
    usedPhotoIds,
    updatePage,
    changeLayout,
    updateFrame,
    addTextBlock,
    updateTextBlock,
    removeTextBlock,
  } = state;

  /** Aviso de "a foto que não coube foi para a página N" — vale para a página onde nasceu. */
  const [moved, setMoved] = useState<{ from: number; to: number; count: number } | null>(
    null,
  );

  const leftPage = album.pages[leftIndex];
  const activeIndex = activeSide === 'left' ? leftIndex : rightIndex;
  const activePage = album.pages[activeIndex] ?? leftPage;
  if (!leftPage || !activePage) return null;

  const capacity = layoutById(activePage.layout).slots;
  const slotIndex = Math.min(Math.max(selectedSlot, 0), Math.max(0, capacity - 1));

  // Na folha espelhada só existe um quadro, e ele mora na página da esquerda.
  const framePage = leftPage.spread ? leftIndex : activeIndex;
  const frameSlot = leftPage.spread ? 0 : slotIndex;
  const frame = album.pages[framePage].slots[frameSlot];

  // O texto é da página que está sendo editada — a mesma do quadro.
  const textPage = framePage;
  const blocks = album.pages[textPage].textBlocks;
  const text = blocks.find((block) => block.id === selectedTextId) ?? null;

  // Fotos que estão no álbum mas em página nenhuma (tiradas de um quadro, ou
  // que chegaram depois da composição). Sem esta bandeja elas sumiam de vista.
  const loose = photos.filter((photo) => !usedPhotoIds.has(photo.id));
  const canPlace = leftPage.spread || capacity > 0;
  const place = (photoId: string) => {
    if (!canPlace) return;
    updateFrame(framePage, frameSlot, { photoId, ...resetFraming(frame.fit) });
  };
  const notice = moved && moved.from === activeIndex ? moved : null;

  const addText = (preset: TextBlockPreset) => {
    const block = makePresetTextBlock(preset);
    onSelectText(addTextBlock(textPage, { ...block, text: copy.textNew }));
  };

  return (
    <>
      {(context === 'sheet' || leftPage.spread) && (
      <Group
        title={copy.sheetGroup}
        right={<span className="ae-meta">{copy.sheetRange(leftIndex + 1, rightIndex + 1)}</span>}
      >
        {!leftPage.spread && context === 'sheet' && (
          <Row label={copy.sheetEditing} stack>
            <Seg<'left' | 'right'>
              full
              label={copy.sheetEditing}
              value={activeSide}
              onChange={onActiveSide}
              options={[
                { value: 'left', label: copy.pageLabel(leftIndex + 1) },
                { value: 'right', label: copy.pageLabel(rightIndex + 1) },
              ]}
            />
          </Row>
        )}
        {/* O espelhado saiu das opções. A chave só aparece em álbum que já o
            usa (salvo antes), para dar um jeito de desfazer. */}
        {leftPage.spread && (
          <Row label={copy.sheetSpread} stack>
            <Seg<boolean>
              full
              label={copy.sheetSpread}
              value={leftPage.spread}
              onChange={(spread) => updatePage(leftIndex, { spread })}
              options={[
                { value: false, label: copy.no },
                { value: true, label: copy.yes },
              ]}
            />
          </Row>
        )}
      </Group>
      )}

      {!leftPage.spread && (
        <Group
          title={copy.pageLabel(activeIndex + 1)}
          help={copy.layoutNote(copy[LAYOUT_LABEL[activePage.layout]] as string)}
        >
          <div className="ae-layouts">
            {EDITOR_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={activePage.layout === layout.id ? 'is-on' : ''}
                onClick={() => {
                  if (activePage.layout === layout.id) return;
                  const result = changeLayout(activeIndex, layout.id);
                  setMoved(
                    result.movedTo === null
                      ? null
                      : { from: activeIndex, to: result.movedTo, count: result.moved },
                  );
                  onSelectSlot(0);
                }}
                title={copy[LAYOUT_LABEL[layout.id]] as string}
                aria-label={copy[LAYOUT_LABEL[layout.id]] as string}
                aria-pressed={activePage.layout === layout.id}
              >
                <LayoutIcon id={layout.id} />
              </button>
            ))}
          </div>

          {notice && (
            <p className="ae-notice" role="status">
              <span>{copy.layoutMoved(notice.count, notice.to + 1)}</span>
              <button type="button" className="ae-chip" onClick={() => onGoToPage(notice.to)}>
                {copy.layoutMovedGo}
              </button>
            </p>
          )}

          {/* Preenchimento só existe onde há quadro para preencher — e não em
              "página inteira" nem em "com margem", que já são as duas respostas
              para uma foto só. O respiro entre quadros saiu da lateral: o
              valor salvo continua valendo, só não se mexe mais aqui. */}
          {capacity > 1 && (
            <>
              {/* Ligado: os quadros vão até a borda do papel. Desligado: a
                  página ganha margem branca em volta. */}
              <Row label={copy.pageFill} help={copy.pageFillHelp} switchRow>
                <Switch
                  label={copy.pageFill}
                  checked={activePage.fill}
                  onChange={(fill) => updatePage(activeIndex, { fill })}
                />
              </Row>
            </>
          )}

          {activePage.layout === 'text' && (
            <>
              <input
                className="ae-input"
                value={activePage.heading}
                placeholder={copy.pageHeadingPlaceholder}
                aria-label={copy.pageHeadingPlaceholder}
                onChange={(event) => updatePage(activeIndex, { heading: event.target.value })}
              />
              <textarea
                className="ae-input"
                rows={4}
                value={activePage.body}
                placeholder={copy.pageBodyPlaceholder}
                aria-label={copy.pageBodyPlaceholder}
                onChange={(event) => updatePage(activeIndex, { body: event.target.value })}
              />
            </>
          )}
        </Group>
      )}

      {(leftPage.spread || capacity > 0) && (
        <Group
          title={
            leftPage.spread ? copy.spreadPhotoGroup : copy.frameGroup(slotIndex + 1, capacity)
          }
          /* Tirar a foto mora junto do nome do quadro: é sobre *este* quadro,
             e o quadro se escolhe clicando nele na página. */
          right={
            frame.photoId ? (
              <button
                type="button"
                className="ae-danger"
                onClick={() =>
                  updateFrame(framePage, frameSlot, { photoId: null, ...resetFraming() })
                }
              >
                <IconX size={12} /> {copy.clearFrame}
              </button>
            ) : undefined
          }
        >

          {!frame.photoId && <p className="ae-note">{copy.frameEmptyNote}</p>}

          {frame.photoId && (
          <>
          <Row label={copy.fieldFit} help={copy.fitNote} stack>
            <Seg<FrameFit>
              full
              label={copy.fieldFit}
              value={frame.fit}
              onChange={(fit) => updateFrame(framePage, frameSlot, { fit })}
              options={[
                { value: 'cover', label: copy.fitCover },
                { value: 'contain', label: copy.fitContain },
              ]}
            />
          </Row>

          <Row label={copy.fieldZoom} stack>
            <Slider
              value={frame.zoom}
              min={1}
              max={3}
              step={0.02}
              label={copy.fieldZoom}
              onChange={(zoom) => updateFrame(framePage, frameSlot, { zoom })}
            />
          </Row>
          </>
          )}
          {frame.photoId && (
            <button
              type="button"
              className="ae-chip"
              onClick={() => updateFrame(framePage, frameSlot, resetFraming(frame.fit))}
            >
              {copy.recenterFrame}
            </button>
          )}
        </Group>
      )}

      {loose.length > 0 && (
        <Group
          title={copy.trayGroup}
          help={canPlace ? copy.trayNote : copy.trayNoFrame}
          right={<span className="ae-meta">{loose.length}</span>}
        >
          <div className="ae-tray" role="list">
            {loose.map((photo) => {
              const src = resolve(photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  role="listitem"
                  className="ae-tray-item"
                  draggable
                  disabled={!src}
                  aria-label={copy.trayPlaceAria(photo.file?.name ?? '')}
                  title={canPlace ? copy.trayNote : copy.trayNoFrame}
                  onClick={() => place(photo.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copyMove';
                    event.dataTransfer.setData(PHOTO_DND_TYPE, photo.id);
                  }}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" draggable={false} loading="lazy" />
                  )}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title={copy.pageTextGroup} help={copy.pageTextNote}>
        {/* Os três pontos de partida numa fileira só, de cima para baixo da
            página: no alto, sobre a foto, embaixo. */}
        <div className="ae-text-adds">
          <button type="button" className="ae-chip" onClick={() => addText('header')}>
            {copy.addHeader}
          </button>
          <button type="button" className="ae-chip" onClick={() => addText('overlay')}>
            {copy.addOverlay}
          </button>
          <button type="button" className="ae-chip" onClick={() => addText('caption')}>
            {copy.addCaption}
          </button>
        </div>

        {blocks.length > 0 && (
          <div className="ae-chips">
            {blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className={`ae-chip${selectedTextId === block.id ? ' is-on' : ''}`}
                onClick={() => onSelectText(block.id)}
              >
                {block.text.slice(0, 16) || copy.untitled}
              </button>
            ))}
          </div>
        )}

        {text && (
          <>
            <textarea
              className="ae-input"
              rows={2}
              value={text.text}
              aria-label={copy.pageTextGroup}
              onChange={(event) =>
                updateTextBlock(textPage, text.id, { text: event.target.value })
              }
            />

            <Row label={copy.fieldFont}>
              <select
                className="ae-input"
                aria-label={copy.fieldFont}
                value={text.font}
                style={{ fontFamily: fontById(text.font).stack }}
                onChange={(event) =>
                  updateTextBlock(textPage, text.id, {
                    font: event.target.value as CoverFontId,
                  })
                }
              >
                {COVER_FONTS.map((font) => (
                  <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                    {copy[font.labelKey as keyof EditorCopy] as string}
                  </option>
                ))}
              </select>
            </Row>

            <Row label={copy.fieldSize} hint="mm">
              <Slider
                value={text.size}
                min={2}
                max={40}
                step={0.5}
                label={copy.fieldSize}
                onChange={(size) => updateTextBlock(textPage, text.id, { size })}
              />
            </Row>

            <Row label={copy.fieldWidth} hint="%">
              <Slider
                value={text.width}
                min={10}
                max={100}
                unit="%"
                label={copy.fieldWidth}
                onChange={(width) => updateTextBlock(textPage, text.id, { width })}
              />
            </Row>

            <Row label={copy.fieldAlign} stack>
              <Seg<TextAlign>
                full
                label={copy.fieldAlign}
                value={text.align}
                onChange={(align) => updateTextBlock(textPage, text.id, { align })}
                options={[
                  { value: 'left', icon: <IconAlignLeft size={13} />, title: copy.alignLeft },
                  {
                    value: 'center',
                    icon: <IconAlignCenter size={13} />,
                    title: copy.alignCenter,
                  },
                  { value: 'right', icon: <IconAlignRight size={13} />, title: copy.alignRight },
                ]}
              />
            </Row>

            <Row label={copy.fieldColor} stack>
              <Seg<InkChoice>
                full
                label={copy.fieldColor}
                value={inkChoice(text.color)}
                onChange={(choice) =>
                  updateTextBlock(textPage, text.id, { color: INK_VALUE[choice] })
                }
                options={[
                  { value: 'ink', label: copy.colorInk },
                  { value: 'white', label: copy.colorWhite },
                  { value: 'dark', label: copy.colorDark },
                ]}
              />
            </Row>

            <Row label={copy.fieldBackdrop} stack>
              <Seg<TextBackdrop>
                full
                label={copy.fieldBackdrop}
                value={text.backdrop}
                onChange={(backdrop) => updateTextBlock(textPage, text.id, { backdrop })}
                options={[
                  { value: 'none', label: copy.backdropNone },
                  { value: 'shade', label: copy.backdropShade },
                  { value: 'paper', label: copy.backdropPaper },
                ]}
              />
            </Row>

            <Row label={copy.fieldDepth} stack>
              <Seg<boolean>
                full
                label={copy.fieldDepth}
                value={text.behind}
                onChange={(behind) => updateTextBlock(textPage, text.id, { behind })}
                options={[
                  { value: false, label: copy.depthFront },
                  { value: true, label: copy.depthBehind },
                ]}
              />
            </Row>

            <Row label={copy.fieldCase} stack>
              <Seg<boolean>
                full
                label={copy.fieldCase}
                value={text.uppercase}
                onChange={(uppercase) => updateTextBlock(textPage, text.id, { uppercase })}
                options={[
                  { value: true, label: copy.caseUpper },
                  { value: false, label: copy.caseOriginal },
                ]}
              />
            </Row>

            <Row label={copy.fieldRotation}>
              <Slider
                value={text.rotation}
                min={-90}
                max={90}
                unit="°"
                label={copy.fieldRotation}
                onChange={(rotation) => updateTextBlock(textPage, text.id, { rotation })}
              />
            </Row>

            <button
              type="button"
              className="ae-danger"
              onClick={() => {
                removeTextBlock(textPage, text.id);
                onSelectText(null);
              }}
            >
              <IconTrash size={12} /> {copy.removeText}
            </button>
          </>
        )}
      </Group>
    </>
  );
}
