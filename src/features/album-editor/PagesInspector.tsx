'use client';

import { paperById } from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
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
import type { Photo } from '@/types/photo';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider } from './controls';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconImage,
  IconTrash,
  IconX,
} from './icons';
import { LayoutIcon } from './LayoutIcon';
import { PHOTO_DND_TYPE } from './PageContent';
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
  photos: Photo[];
  leftIndex: number;
  rightIndex: number;
  activeSide: 'left' | 'right';
  onActiveSide: (side: 'left' | 'right') => void;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  onUpload: (files: File[]) => void;
}

/**
 * Controles da folha aberta, dos quadros, dos textos e da bandeja de fotos.
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
  photos,
  leftIndex,
  rightIndex,
  activeSide,
  onActiveSide,
  selectedSlot,
  onSelectSlot,
  selectedTextId,
  onSelectText,
  onUpload,
}: PagesInspectorProps) {
  const {
    album,
    updatePage,
    updateFrame,
    addTextBlock,
    updateTextBlock,
    removeTextBlock,
    removeSheet,
    usedPhotoIds,
    minPages,
  } = state;

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

  const paper = paperById(album.paper);

  /** Onde a foto clicada na bandeja cai. */
  const place = (photoId: string) =>
    updateFrame(framePage, frameSlot, { photoId, ...resetFraming(frame.fit) });

  const addText = (preset: TextBlockPreset) => {
    const block = makePresetTextBlock(preset);
    onSelectText(addTextBlock(textPage, { ...block, text: copy.textNew }));
  };

  return (
    <>
      <Group
        title={copy.sheetGroup}
        right={<span className="ae-meta">{copy.sheetRange(leftIndex + 1, rightIndex + 1)}</span>}
      >
        {!leftPage.spread && (
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
        <Row label={copy.sheetSpread} hint={copy.sheetSpreadHint} stack>
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
      </Group>

      {!leftPage.spread && (
        <Group title={copy.pageLabel(activeIndex + 1)}>
          <div className="ae-layouts">
            {EDITOR_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={activePage.layout === layout.id ? 'is-on' : ''}
                onClick={() => {
                  updatePage(activeIndex, { layout: layout.id });
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
          <p className="ae-note">
            {copy.layoutNote(copy[LAYOUT_LABEL[activePage.layout]] as string)}
          </p>

          {/* Preenchimento e respiro só existem onde há quadro para preencher —
              e não em "página inteira" nem em "com margem", que já são as duas
              respostas para uma foto só. */}
          {capacity > 1 && (
            <>
              <Row label={copy.pageFill} hint={copy.pageFillHint} stack>
                <Seg<boolean>
                  full
                  label={copy.pageFill}
                  value={activePage.fill}
                  onChange={(fill) => updatePage(activeIndex, { fill })}
                  options={[
                    { value: true, label: copy.fillBleed },
                    { value: false, label: copy.fillMargin },
                  ]}
                />
              </Row>
              <Row label={copy.pageGap} hint={copy.pageGapHint} stack>
                <Slider
                  value={activePage.gap}
                  min={0}
                  max={12}
                  step={0.5}
                  unit=" mm"
                  label={copy.pageGap}
                  onChange={(gap) => updatePage(activeIndex, { gap })}
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
        >
          {/* Escolher o quadro sem precisar acertar o clique na página. */}
          {!leftPage.spread && capacity > 1 && (
            <Row label={copy.framePick} stack>
              <div className="ae-frames" role="group" aria-label={copy.framePick}>
                {Array.from({ length: capacity }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === slotIndex ? 'is-on' : ''}
                    aria-pressed={i === slotIndex}
                    aria-label={copy.frameNumber(i + 1)}
                    onClick={() => onSelectSlot(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </Row>
          )}

          <Row label={copy.fieldFit} stack>
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
          <p className="ae-note">{copy.fitNote}</p>
          {frame.photoId && (
            <>
              <button
                type="button"
                className="ae-chip"
                onClick={() => updateFrame(framePage, frameSlot, resetFraming(frame.fit))}
              >
                {copy.recenterFrame}
              </button>
              <button
                type="button"
                className="ae-danger"
                onClick={() =>
                  updateFrame(framePage, frameSlot, { photoId: null, ...resetFraming() })
                }
              >
                <IconX size={12} /> {copy.clearFrame}
              </button>
            </>
          )}
        </Group>
      )}

      <Group
        title={copy.pageTextGroup}
        right={
          <span style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="ae-chip" onClick={() => addText('caption')}>
              {copy.addCaption}
            </button>
            <button type="button" className="ae-chip" onClick={() => addText('header')}>
              {copy.addHeader}
            </button>
          </span>
        }
      >
        <button
          type="button"
          className="ae-chip"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => addText('overlay')}
        >
          {copy.addOverlay}
        </button>

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

        {!text && <p className="ae-note">{copy.pageTextNote}</p>}

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

            <Row label={copy.fieldWidth} hint={copy.fieldWidthHint}>
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

            <p className="ae-note">{copy.pageTextNote}</p>

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

      <Group
        title={copy.trayGroup}
        right={
          <label className="ae-chip is-file">
            <IconImage size={12} /> {copy.trayUpload}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                onUpload(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </label>
        }
      >
        {photos.length === 0 ? (
          <p className="ae-note">{copy.trayEmpty}</p>
        ) : (
          <>
            <div className="ae-tray">
              {photos.map((photo) => {
                const used = usedPhotoIds.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    className={used ? 'is-on' : ''}
                    title={used ? `${photo.fileName} — ${copy.trayUsed}` : photo.fileName}
                    onClick={() => place(photo.id)}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData(PHOTO_DND_TYPE, photo.id)
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt={photo.fileName} draggable={false} />
                    {used && <span className="ae-tray-dot" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p className="ae-note">{copy.trayNote}</p>
          </>
        )}
      </Group>

      <Group title={copy.innerGroup}>
        <button
          type="button"
          className="ae-danger"
          disabled={album.pages.length <= minPages}
          onClick={() => removeSheet(leftIndex)}
        >
          <IconTrash size={12} /> {copy.removeSheet}
        </button>
        <p className="ae-note">{copy.innerNote(formatMm(paper.mm, 2))}</p>
      </Group>
    </>
  );
}
