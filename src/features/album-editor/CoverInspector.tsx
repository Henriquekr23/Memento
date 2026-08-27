'use client';

import {
  SPEC,
  spineSafeWidth,
  spineTextSize,
  paperById,
} from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
import type { CoverElement, CoverFontId, MotifShape, TextAlign } from '@/types/album-editor';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider } from './controls';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconWarning,
} from './icons';
import { ALBUM_COLORS, COVER_FONTS, fontById } from './palette';
import { MOTIF_SHAPES } from './motifs';

/** Nove posições de atalho, na grade 3×3 da página. */
const SHORTCUTS: [string, number, number][] = [
  ['↖', 18, 16], ['↑', 50, 16], ['↗', 82, 16],
  ['←', 18, 50], ['·', 50, 50], ['→', 82, 50],
  ['↙', 18, 84], ['↓', 50, 84], ['↘', 82, 84],
];

const SHAPE_LABEL: Record<MotifShape, keyof EditorCopy> = {
  eye: 'shapeEye',
  disc: 'shapeDisc',
  arch: 'shapeArch',
  stripes: 'shapeStripes',
  waves: 'shapeWaves',
  frame: 'shapeFrame',
};

interface CoverInspectorProps {
  state: EditorAlbumState;
  copy: EditorCopy;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Controles da capa, da lombada e da contracapa. */
export function CoverInspector({ state, copy, selectedId, onSelect }: CoverInspectorProps) {
  const { album, patch, spine, updateElement, removeElement, addText, addMotif } = state;
  const selected: CoverElement | null =
    album.elements.find((element) => element.id === selectedId) ?? null;

  const paper = paperById(album.paper);
  const spineSize = spineTextSize(spine, album.spine.size);
  const safeWidth = spineSafeWidth(spine);

  return (
    <>
      <Group title={copy.colorGroup}>
        <div className="ae-swatches">
          {ALBUM_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={album.color === color.id ? 'is-on' : ''}
              style={{ background: color.bg }}
              onClick={() => patch({ color: color.id })}
              title={copy[color.labelKey as keyof EditorCopy] as string}
              aria-pressed={album.color === color.id}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 'auto 2px 2px auto',
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: color.ink,
                }}
              />
            </button>
          ))}
        </div>
        <p className="ae-note">{copy.colorNote}</p>
      </Group>

      <Group
        title={copy.elementsGroup}
        right={
          <span style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="ae-chip" onClick={() => onSelect(addText(''))}>
              {copy.addText}
            </button>
            <button type="button" className="ae-chip" onClick={() => onSelect(addMotif())}>
              {copy.addShape}
            </button>
          </span>
        }
      >
        <div className="ae-chips">
          {album.elements.map((element) => (
            <button
              key={element.id}
              type="button"
              className={`ae-chip${selectedId === element.id ? ' is-on' : ''}`}
              onClick={() => onSelect(element.id)}
            >
              {element.kind === 'motif'
                ? (copy[SHAPE_LABEL[element.shape]] as string)
                : `${element.role === 'title' ? '★ ' : ''}${
                    element.text.slice(0, 14) || copy.untitled
                  }`}
            </button>
          ))}
        </div>
        {!selected && <p className="ae-note">{copy.elementsNote}</p>}
      </Group>

      {selected?.kind === 'text' && (
        <Group
          title={selected.role === 'title' ? copy.titleGroup : copy.textGroup}
          right={
            selected.role !== 'title' && (
              <button
                type="button"
                className="ae-danger"
                onClick={() => {
                  removeElement(selected.id);
                  onSelect(null);
                }}
              >
                <IconTrash size={12} /> {copy.remove}
              </button>
            )
          }
        >
          <textarea
            className="ae-input"
            rows={2}
            value={selected.text}
            aria-label={selected.role === 'title' ? copy.titleGroup : copy.textGroup}
            onChange={(event) => updateElement(selected.id, { text: event.target.value })}
          />

          <Row label={copy.fieldFont}>
            <select
              className="ae-input"
              value={selected.font}
              style={{ fontFamily: fontById(selected.font).stack }}
              onChange={(event) =>
                updateElement(selected.id, { font: event.target.value as CoverFontId })
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
              value={selected.size}
              min={3}
              max={70}
              step={0.5}
              label={copy.fieldSize}
              onChange={(size) => updateElement(selected.id, { size })}
            />
          </Row>

          <Row label={copy.fieldTracking}>
            <Slider
              value={selected.tracking}
              min={-8}
              max={30}
              step={0.5}
              unit="%"
              label={copy.fieldTracking}
              onChange={(tracking) => updateElement(selected.id, { tracking })}
            />
          </Row>

          <Row label={copy.fieldLeading}>
            <Slider
              value={selected.leading}
              min={0.7}
              max={1.8}
              step={0.02}
              label={copy.fieldLeading}
              onChange={(leading) => updateElement(selected.id, { leading })}
            />
          </Row>

          <Row label={copy.fieldWidth} hint={copy.fieldWidthHint}>
            <Slider
              value={selected.width}
              min={15}
              max={100}
              unit="%"
              label={copy.fieldWidth}
              onChange={(width) => updateElement(selected.id, { width })}
            />
          </Row>

          <Row label={copy.fieldRotation}>
            <Slider
              value={selected.rotation}
              min={-90}
              max={90}
              unit="°"
              label={copy.fieldRotation}
              onChange={(rotation) => updateElement(selected.id, { rotation })}
            />
          </Row>

          <Row label={copy.fieldAlign}>
            <Seg<TextAlign>
              full
              value={selected.align}
              onChange={(align) => updateElement(selected.id, { align })}
              options={[
                { value: 'left', icon: <IconAlignLeft size={13} />, title: copy.alignLeft },
                { value: 'center', icon: <IconAlignCenter size={13} />, title: copy.alignCenter },
                { value: 'right', icon: <IconAlignRight size={13} />, title: copy.alignRight },
              ]}
            />
          </Row>

          <Row label={copy.fieldCase}>
            <Seg<boolean>
              full
              value={selected.uppercase}
              onChange={(uppercase) => updateElement(selected.id, { uppercase })}
              options={[
                { value: true, label: copy.caseUpper },
                { value: false, label: copy.caseOriginal },
              ]}
            />
          </Row>

          <Row label={copy.fieldPosition} hint={copy.fieldPositionHint}>
            <span
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 3,
                width: '100%',
              }}
            >
              {SHORTCUTS.map(([glyph, x, y]) => (
                <button
                  key={glyph}
                  type="button"
                  className="ae-chip"
                  style={{ padding: '3px 0', justifyContent: 'center' }}
                  onClick={() => updateElement(selected.id, { x, y })}
                >
                  {glyph}
                </button>
              ))}
            </span>
          </Row>

          <p className="ae-note">
            {selected.role === 'title'
              ? copy.titleNote
              : copy.freeTextNote(Math.round(selected.x), Math.round(selected.y))}
          </p>
        </Group>
      )}

      {selected?.kind === 'motif' && (
        <Group
          title={copy.shapeGroup}
          right={
            <button
              type="button"
              className="ae-danger"
              onClick={() => {
                removeElement(selected.id);
                onSelect(null);
              }}
            >
              <IconTrash size={12} /> {copy.remove}
            </button>
          }
        >
          <div className="ae-chips">
            {MOTIF_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className={`ae-chip${selected.shape === shape ? ' is-on' : ''}`}
                onClick={() => updateElement(selected.id, { shape })}
              >
                {copy[SHAPE_LABEL[shape]] as string}
              </button>
            ))}
          </div>
          <Row label={copy.fieldShapeSize}>
            <Slider
              value={selected.size}
              min={8}
              max={110}
              unit="%"
              label={copy.fieldShapeSize}
              onChange={(size) => updateElement(selected.id, { size })}
            />
          </Row>
          <Row label={copy.fieldRotation}>
            <Slider
              value={selected.rotation}
              min={-180}
              max={180}
              unit="°"
              label={copy.fieldRotation}
              onChange={(rotation) => updateElement(selected.id, { rotation })}
            />
          </Row>
        </Group>
      )}

      <Group
        title={copy.spineGroup}
        right={
          <button
            type="button"
            className="ae-chip"
            aria-pressed={album.spine.show}
            onClick={() => patch({ spine: { ...album.spine, show: !album.spine.show } })}
          >
            {album.spine.show ? <IconEye size={12} /> : <IconEyeOff size={12} />}
          </button>
        }
      >
        <Row label={copy.spineMeasure} hint="mm">
          <Seg<string>
            full
            value={album.spine.mm ? 'manual' : 'auto'}
            onChange={(mode) =>
              patch({ spine: { ...album.spine, mm: mode === 'auto' ? null : spine } })
            }
            options={[
              { value: 'auto', label: copy.spineAuto },
              { value: 'manual', label: copy.spineManual },
            ]}
          />
        </Row>

        {album.spine.mm ? (
          <Row label={copy.spineThickness} hint={copy.spineThicknessHint}>
            <input
              className="ae-input"
              type="number"
              step="0.1"
              min={SPEC.spineMin}
              value={album.spine.mm}
              onChange={(event) =>
                patch({
                  spine: {
                    ...album.spine,
                    mm: Number(event.target.value) || SPEC.spineMin,
                  },
                })
              }
            />
          </Row>
        ) : (
          <p className="ae-note">
            {copy.spineComputed(
              formatMm(spine, 2),
              album.pages.length,
              copy[paper.labelKey as keyof EditorCopy] as string,
              SPEC.spineMin,
            )}
          </p>
        )}

        <Row label={copy.spineDirection}>
          <Seg<'ascending' | 'descending'>
            full
            value={album.spine.direction}
            onChange={(direction) => patch({ spine: { ...album.spine, direction } })}
            options={[
              { value: 'ascending', label: copy.spineAscending },
              { value: 'descending', label: copy.spineDescending },
            ]}
          />
        </Row>

        <Row label={copy.spineOffset}>
          <Slider
            value={album.spine.offset}
            min={12}
            max={88}
            unit="%"
            label={copy.spineOffset}
            onChange={(offset) => patch({ spine: { ...album.spine, offset } })}
          />
        </Row>

        <Row label={copy.spineSize} hint="mm">
          <Slider
            value={spineSize}
            min={2}
            max={Math.max(3, spine - 2)}
            step={0.1}
            label={copy.spineSize}
            onChange={(size) => patch({ spine: { ...album.spine, size } })}
          />
        </Row>

        <Row label={copy.spineYear}>
          <input
            className="ae-input"
            value={album.spine.year}
            placeholder="2026"
            onChange={(event) =>
              patch({
                spine: {
                  ...album.spine,
                  year: event.target.value,
                  showYear: event.target.value.trim().length > 0,
                },
              })
            }
          />
        </Row>

        {spineSize > safeWidth && (
          <p className="ae-warn">
            <IconWarning size={12} />
            <span>{copy.spineOverflow(formatMm(safeWidth))}</span>
          </p>
        )}
      </Group>

      <Group title={copy.backGroup}>
        <Row label={copy.backShow}>
          <Seg<boolean>
            full
            value={album.back.show}
            onChange={(show) => patch({ back: { ...album.back, show } })}
            options={[
              { value: false, label: copy.backClean },
              { value: true, label: copy.backWithText },
            ]}
          />
        </Row>
        {album.back.show && (
          <textarea
            className="ae-input"
            rows={3}
            value={album.back.text}
            placeholder={copy.backPlaceholder}
            aria-label={copy.backGroup}
            onChange={(event) => patch({ back: { ...album.back, text: event.target.value } })}
          />
        )}
      </Group>
    </>
  );
}
