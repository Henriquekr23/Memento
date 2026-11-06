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

import { useState } from 'react';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider, Switch } from './controls';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconPlus,
  IconTrash,
  IconType,
  IconWarning,
} from './icons';
import {
  ALBUM_COLORS,
  COVER_FONTS,
  CUSTOM_COLOR,
  colorOf,
  contrastRatio,
  isHexColor,
} from './palette';
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
  const { album, patch, spine, updateElement, removeElement, addText, addEmoji, addMotif } =
    state;
  const [emojiOpen, setEmojiOpen] = useState(false);
  const color = colorOf(album);
  const isCustom = album.color === CUSTOM_COLOR;
  const lowContrast = isCustom && contrastRatio(color.bg, color.ink) < 3;
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
    // O ícone da linha já é o próprio emoji.
    if (element.role === 'emoji') return copy.emojiGroup;
    return element.text.trim().slice(0, 22) || copy.untitled;
  };

  return (
    <>
      {title && (
        <Group title={copy.titleGroup} help={copy.titleNote} collapsible>
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

      <Group title={copy.colorGroup} help={copy.colorNote} collapsible>
        <Seg<boolean>
          full
          label={copy.colorModeAria}
          value={isCustom}
          onChange={(custom) => {
            if (!custom) {
              // Volta para a última cor padrão — ou a primeira, se nunca houve.
              const last = ALBUM_COLORS.find((c) => c.bg === color.bg && c.ink === color.ink);
              patch({ color: last?.id ?? ALBUM_COLORS[0].id });
              return;
            }
            // A primeira vez parte da cor que já está na capa: a pessoa ajusta
            // a partir do que vê, em vez de cair num par aleatório.
            patch({
              color: CUSTOM_COLOR,
              customColor: album.customColor ?? { bg: color.bg, ink: color.ink },
            });
          }}
          options={[
            { value: false, label: copy.colorPresets },
            { value: true, label: copy.colorCustomMode },
          ]}
        />

        {!isCustom ? (
          <div className="ae-swatches">
            {ALBUM_COLORS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={album.color === preset.id ? 'is-on' : ''}
                style={{ background: preset.bg }}
                onClick={() => patch({ color: preset.id })}
                title={copy[preset.labelKey as keyof EditorCopy] as string}
                aria-label={copy[preset.labelKey as keyof EditorCopy] as string}
                aria-pressed={album.color === preset.id}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 'auto 3px 3px auto',
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: preset.ink,
                  }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="ae-custom-colors">
            <ColorField
              label={copy.colorPrimary}
              note={copy.colorPrimaryNote}
              value={color.bg}
              onChange={(bg) => patch({ customColor: { bg, ink: color.ink } })}
            />
            <ColorField
              label={copy.colorSecondary}
              note={copy.colorSecondaryNote}
              value={color.ink}
              onChange={(ink) => patch({ customColor: { bg: color.bg, ink } })}
            />
            <div className="ae-color-preview" style={{ background: color.bg, color: color.ink }} aria-hidden>
              Aa
            </div>
            {lowContrast && (
              <p className="ae-warn">
                <IconWarning size={12} />
                <span>{copy.colorContrastWarn}</span>
              </p>
            )}
          </div>
        )}
      </Group>

      <Group title={copy.elementsGroup} help={copy.elementsNote} collapsible>
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
                  {element.kind === 'text' && element.role === 'emoji' ? (
                    <span className="ae-layer-emoji">{element.text}</span>
                  ) : element.kind === 'motif' ? (
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
          <button
            type="button"
            className={`ae-chip${emojiOpen ? ' is-on' : ''}`}
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen((value) => !value)}
          >
            {copy.addEmoji}
          </button>
        </div>
        {emojiOpen && (
          <EmojiPicker
            copy={copy}
            aria={copy.emojiAria}
            onPick={(emoji) => {
              onSelect(addEmoji(emoji));
              setEmojiOpen(false);
            }}
          />
        )}
      </Group>

      {selected?.kind === 'text' && selected.role === 'emoji' && (
        <Group
          title={copy.emojiGroup}
          right={
            <button type="button" className="ae-chip" onClick={() => onSelect(null)}>
              {copy.done}
            </button>
          }
        >
          <EmojiPicker
            copy={copy}
            aria={copy.emojiSwapAria}
            current={selected.text}
            onPick={(emoji) => updateElement(selected.id, { text: emoji })}
          />
          <Row label={copy.fieldShapeSize} hint="mm">
            <Slider
              value={selected.size}
              min={6}
              max={90}
              step={0.5}
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

      {selected?.kind === 'text' && selected.role !== 'emoji' && (
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

/** Uma cor escolhida à mão: o seletor do sistema e o código ao lado. */
function ColorField({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // O código acompanha o seletor; digitado, só vale quando forma uma cor.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  return (
    <div className="ae-color-field">
      <label className="ae-color-swatch" style={{ background: value }}>
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </label>
      <span className="ae-color-text">
        <span className="ae-color-name">{label}</span>
        <span className="ae-note">{note}</span>
      </span>
      <input
        className="ae-input ae-color-hex"
        value={draft}
        aria-label={`${label} (hex)`}
        spellCheck={false}
        maxLength={7}
        onChange={(event) => {
          const next = event.target.value.startsWith('#')
            ? event.target.value
            : `#${event.target.value}`;
          setDraft(next);
          if (isHexColor(next)) onChange(next.toUpperCase());
        }}
        onBlur={() => setDraft(value)}
      />
    </div>
  );
}

/** Emojis de viagem para começar; o campo embaixo aceita qualquer outro. */
const EMOJIS = [
  '✈️', '🌍', '🗺️', '🧭', '🏝️', '🏖️', '🌊', '⛰️',
  '🏔️', '🌋', '🏕️', '🌅', '🌄', '🌙', '⭐', '☀️',
  '🌸', '🌴', '🌵', '🍃', '🚗', '🚂', '🚢', '⛵',
  '🚲', '🎒', '📷', '🎞️', '🗼', '🏛️', '⛩️', '🏰',
  '🍕', '🍜', '🍷', '☕', '🍦', '❤️', '🎉', '✨',
];

/** Primeiro "caractere que a pessoa vê" de um texto — um emoji composto inteiro. */
function firstGrapheme(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next();
    return first.done ? '' : first.value.segment;
  }
  return Array.from(trimmed)[0] ?? '';
}

function EmojiPicker({
  copy,
  aria,
  current,
  onPick,
}: {
  copy: EditorCopy;
  aria: (emoji: string) => string;
  current?: string;
  onPick: (emoji: string) => void;
}) {
  const [other, setOther] = useState('');
  return (
    <div className="ae-emoji">
      <div className="ae-emoji-grid" role="group" aria-label={copy.emojiPick}>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={current === emoji ? 'is-on' : ''}
            aria-pressed={current === emoji}
            aria-label={aria(emoji)}
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form
        className="ae-emoji-other"
        onSubmit={(event) => {
          event.preventDefault();
          const emoji = firstGrapheme(other);
          if (!emoji) return;
          onPick(emoji);
          setOther('');
        }}
      >
        <input
          className="ae-input"
          value={other}
          placeholder={copy.emojiOtherPlaceholder}
          aria-label={copy.emojiOther}
          onChange={(event) => setOther(event.target.value)}
        />
        <button
          type="submit"
          className="ae-chip"
          aria-label={copy.emojiOther}
          title={copy.emojiOther}
          disabled={!firstGrapheme(other)}
        >
          <IconPlus size={13} />
        </button>
      </form>
    </div>
  );
}
