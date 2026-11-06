'use client';

import { spineSafeWidth, spineTextSize } from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
import type {
  CoverElement,
  CoverFontId,
  CoverTextElement,
  MotifShape,
  TextAlign,
} from '@/types/album-editor';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider, Switch } from './controls';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconTrash,
  IconType,
  IconWarning,
} from './icons';
import { ALBUM_COLORS, COVER_FONTS } from './palette';
import { Motif, MOTIF_SHAPES } from './motifs';

/** Nove posições de atalho, na grade 3×3 da página. */
const SHORTCUTS: [string, number, number][] = [
  ['topLeft', 18, 16], ['top', 50, 16], ['topRight', 82, 16],
  ['left', 18, 50], ['center', 50, 50], ['right', 82, 50],
  ['bottomLeft', 18, 84], ['bottom', 50, 84], ['bottomRight', 82, 84],
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
  /** O nome do álbum é o título da capa: escrever aqui é renomear o álbum. */
  name: string;
  onName: (name: string) => void;
}

/**
 * Controles da capa, da lombada e da contracapa.
 *
 * A ordem é a de quem monta uma capa: primeiro **o que está escrito** (o
 * título, sempre à mão, sem precisar achá-lo numa lista), depois **a cor**,
 * depois o que mais entra na capa. Lombada e contracapa são interruptores:
 * desligadas, ocupam uma linha; ligadas, abrem os próprios ajustes. As medidas
 * de gráfica (espessura, corpo da lombada) saíram desta tela por ora.
 */
export function CoverInspector({
  state,
  copy,
  selectedId,
  onSelect,
  name,
  onName,
}: CoverInspectorProps) {
  const { album, patch, spine, updateElement, removeElement, addText, addMotif } = state;
  const selected: CoverElement | null =
    album.elements.find((element) => element.id === selectedId) ?? null;
  const title = album.elements.find(
    (element): element is CoverTextElement =>
      element.kind === 'text' && element.role === 'title',
  );

  const spineSize = spineTextSize(spine, album.spine.size);
  const safeWidth = spineSafeWidth(spine);

  const elementLabel = (element: CoverElement) => {
    if (element.kind === 'motif') return copy[SHAPE_LABEL[element.shape]] as string;
    if (element.role === 'title') return name.trim() || copy.coverTitlePlaceholder;
    return element.text.trim().slice(0, 22) || copy.untitled;
  };

  return (
    <>
      {title && (
        <Group title={copy.titleGroup} help={copy.titleNote}>
          <input
            className="ae-input ae-input-lg"
            value={name}
            placeholder={copy.coverTitlePlaceholder}
            aria-label={copy.titleGroup}
            onChange={(event) => onName(event.target.value)}
          />
          <FontPicker
            copy={copy}
            value={title.font}
            onChange={(font) => updateElement(title.id, { font })}
          />
          <Row label={copy.fieldSize} hint="mm">
            <Slider
              value={title.size}
              min={3}
              max={70}
              step={0.5}
              label={copy.fieldSize}
              onChange={(size) => updateElement(title.id, { size })}
            />
          </Row>
        </Group>
      )}

      <Group title={copy.colorGroup} help={copy.colorNote}>
        <div className="ae-swatches">
          {ALBUM_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={album.color === color.id ? 'is-on' : ''}
              style={{ background: color.bg }}
              onClick={() => patch({ color: color.id })}
              title={copy[color.labelKey as keyof EditorCopy] as string}
              aria-label={copy[color.labelKey as keyof EditorCopy] as string}
              aria-pressed={album.color === color.id}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 'auto 3px 3px auto',
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: color.ink,
                }}
              />
            </button>
          ))}
        </div>
      </Group>

      <Group title={copy.elementsGroup} help={copy.elementsNote}>
        <div className="ae-layers" role="list">
          {album.elements.map((element) => (
            <div
              key={element.id}
              role="listitem"
              className={`ae-layer${selectedId === element.id ? ' is-on' : ''}`}
            >
              <button
                type="button"
                className="ae-layer-pick"
                aria-pressed={selectedId === element.id}
                onClick={() => onSelect(selectedId === element.id ? null : element.id)}
              >
                <span className="ae-layer-icon" aria-hidden>
                  {element.kind === 'motif' ? (
                    <svg viewBox="0 0 100 100" width="14" height="14">
                      <Motif shape={element.shape} ink="currentColor" paper="transparent" />
                    </svg>
                  ) : (
                    <IconType size={13} />
                  )}
                </span>
                <span className="ae-layer-name">{elementLabel(element)}</span>
                {element.kind === 'text' && element.role === 'title' && (
                  <span className="ae-layer-tag">{copy.titleGroup}</span>
                )}
              </button>
              {!(element.kind === 'text' && element.role === 'title') && (
                <button
                  type="button"
                  className="ae-layer-del"
                  aria-label={`${copy.remove}: ${elementLabel(element)}`}
                  title={copy.remove}
                  onClick={() => {
                    removeElement(element.id);
                    if (selectedId === element.id) onSelect(null);
                  }}
                >
                  <IconTrash size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="ae-layer-add">
          <button
            type="button"
            className="ae-chip"
            onClick={() => onSelect(addText(copy.textNew))}
          >
            {copy.addText}
          </button>
          <button type="button" className="ae-chip" onClick={() => onSelect(addMotif())}>
            {copy.addShape}
          </button>
        </div>
      </Group>

      {selected?.kind === 'text' && (
        <Group
          title={
            selected.role === 'title' ? copy.titleStyleGroup : copy.textGroup
          }
          right={
            <button type="button" className="ae-chip" onClick={() => onSelect(null)}>
              {copy.done}
            </button>
          }
        >
          {selected.role !== 'title' && (
            <>
              <textarea
                className="ae-input"
                rows={2}
                value={selected.text}
                aria-label={copy.textGroup}
                onChange={(event) => updateElement(selected.id, { text: event.target.value })}
              />
              <FontPicker
                copy={copy}
                value={selected.font}
                onChange={(font) => updateElement(selected.id, { font })}
              />
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
            </>
          )}

          <Row label={copy.fieldAlign} stack>
            <Seg<TextAlign>
              full
              label={copy.fieldAlign}
              value={selected.align}
              onChange={(align) => updateElement(selected.id, { align })}
              options={[
                { value: 'left', icon: <IconAlignLeft size={13} />, title: copy.alignLeft },
                { value: 'center', icon: <IconAlignCenter size={13} />, title: copy.alignCenter },
                { value: 'right', icon: <IconAlignRight size={13} />, title: copy.alignRight },
              ]}
            />
          </Row>

          <Row label={copy.fieldCase} stack>
            <Seg<boolean>
              full
              label={copy.fieldCase}
              value={selected.uppercase}
              onChange={(uppercase) => updateElement(selected.id, { uppercase })}
              options={[
                { value: true, label: copy.caseUpper },
                { value: false, label: copy.caseOriginal },
              ]}
            />
          </Row>

          <PositionPad
            copy={copy}
            x={selected.x}
            y={selected.y}
            onPick={(x, y) => updateElement(selected.id, { x, y })}
          />

          <details className="ae-more">
            <summary>{copy.moreAdjust}</summary>
            <div className="ae-more-body">
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
              <Row label={copy.fieldWidth} hint="%">
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
            </div>
          </details>
        </Group>
      )}

      {selected?.kind === 'motif' && (
        <Group
          title={copy.shapeGroup}
          right={
            <button type="button" className="ae-chip" onClick={() => onSelect(null)}>
              {copy.done}
            </button>
          }
        >
          <div className="ae-shapes" role="group" aria-label={copy.shapeGroup}>
            {MOTIF_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className={selected.shape === shape ? 'is-on' : ''}
                aria-pressed={selected.shape === shape}
                aria-label={copy[SHAPE_LABEL[shape]] as string}
                title={copy[SHAPE_LABEL[shape]] as string}
                onClick={() => updateElement(selected.id, { shape })}
              >
                <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
                  <Motif shape={shape} ink="currentColor" paper="transparent" />
                </svg>
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
          <PositionPad
            copy={copy}
            x={selected.x}
            y={selected.y}
            onPick={(x, y) => updateElement(selected.id, { x, y })}
          />
        </Group>
      )}

      <Group
        title={copy.spineGroup}
        help={copy.spineNote}
        right={
          <Switch
            label={copy.spineGroup}
            checked={album.spine.show}
            onChange={(show) => patch({ spine: { ...album.spine, show } })}
          />
        }
      >
        {album.spine.show && (
          <>
            <Row label={copy.spineDirection} stack>
              <Seg<'ascending' | 'descending'>
                full
                label={copy.spineDirection}
                value={album.spine.direction}
                onChange={(direction) => patch({ spine: { ...album.spine, direction } })}
                options={[
                  { value: 'ascending', label: copy.spineAscending },
                  { value: 'descending', label: copy.spineDescending },
                ]}
              />
            </Row>

            <Row label={copy.spineYear}>
              <input
                className="ae-input"
                aria-label={copy.spineYear}
                value={album.spine.year}
                placeholder={String(new Date().getFullYear())}
                inputMode="numeric"
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
          </>
        )}
      </Group>

      <Group
        title={copy.backGroup}
        right={
          <Switch
            label={copy.backGroup}
            checked={album.back.show}
            onChange={(show) => patch({ back: { ...album.back, show } })}
          />
        }
      >
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

/**
 * As fontes da capa como amostras — "Aa" desenhado em cada uma. Escolher
 * fonte pelo nome numa lista é adivinhar; aqui dá para ver.
 */
function FontPicker({
  copy,
  value,
  onChange,
}: {
  copy: EditorCopy;
  value: CoverFontId;
  onChange: (font: CoverFontId) => void;
}) {
  return (
    <div className="ae-fonts" role="group" aria-label={copy.fieldFont}>
      {COVER_FONTS.map((font) => {
        const label = copy[font.labelKey as keyof EditorCopy] as string;
        return (
          <button
            key={font.id}
            type="button"
            className={value === font.id ? 'is-on' : ''}
            aria-pressed={value === font.id}
            aria-label={label}
            title={label}
            onClick={() => onChange(font.id)}
          >
            <span style={{ fontFamily: font.stack, fontWeight: font.weight }}>Aa</span>
          </button>
        );
      })}
    </div>
  );
}

/** Atalhos de posição na grade 3×3 da capa; o ponto aceso é onde o elemento está. */
function PositionPad({
  copy,
  x,
  y,
  onPick,
}: {
  copy: EditorCopy;
  x: number;
  y: number;
  onPick: (x: number, y: number) => void;
}) {
  return (
    <Row label={copy.fieldPosition} help={copy.positionNote}>
      <span className="ae-pad" role="group" aria-label={copy.fieldPosition}>
        {SHORTCUTS.map(([key, px, py]) => {
          const on = Math.abs(px - x) < 1 && Math.abs(py - y) < 1;
          return (
            <button
              key={key}
              type="button"
              className={on ? 'is-on' : ''}
              aria-pressed={on}
              aria-label={copy.positionLabel(key)}
              title={copy.positionLabel(key)}
              onClick={() => onPick(px, py)}
            >
              <span aria-hidden />
            </button>
          );
        })}
      </span>
    </Row>
  );
}
