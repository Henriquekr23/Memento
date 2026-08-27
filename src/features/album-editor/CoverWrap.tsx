'use client';

import { useCallback } from 'react';

import { SPEC, spineTextSize } from '@/features/album-print/spec';
import type { CoverElement, EditorAlbum } from '@/types/album-editor';
import { titleOf } from '@/types/album-editor';

import { CoverElementView, type SnapFn } from './CoverElementView';
import { COVER_FONTS, colorById, fontById } from './palette';
import { PrintGuides, SpineGuides } from './PrintGuides';

export interface SnapState {
  x: boolean;
  y: boolean;
}

interface CoverWrapProps {
  album: EditorAlbum;
  /** Espessura efetiva da lombada, em mm. */
  spine: number;
  ppm: number;
  guides: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CoverElement>) => void;
  snap: SnapState;
  setSnap: (snap: SnapState) => void;
}

/**
 * O desdobre completo da capa: contracapa · lombada · capa, na mesma peça.
 *
 * É assim que a gráfica recebe o arquivo e é a única vista em que dá para ver
 * se o título cabe na lombada ao mesmo tempo em que se decide onde ele fica na
 * capa. Cada face sangra só nos lados em que existe corte.
 */
export function CoverWrap({
  album,
  spine,
  ppm,
  guides,
  selectedId,
  onSelect,
  onChange,
  snap,
  setSnap,
}: CoverWrapProps) {
  const color = colorById(album.color);
  const trim = SPEC.trim;
  const bleed = SPEC.bleed;

  const pageW = trim.w * ppm;
  const pageH = trim.h * ppm;
  const spineW = spine * ppm;

  const title = titleOf(album);
  const spineSize = spineTextSize(spine, album.spine.size);

  /** Encaixe magnético nos dois eixos centrais. Tolerância em % da página. */
  const snapTo = useCallback<SnapFn>(
    (x, y) => {
      if (x === null || y === null) {
        setSnap({ x: false, y: false });
        return { x: x ?? 0, y: y ?? 0 };
      }
      const tolerance = 1.4;
      let hitX = false;
      let hitY = false;
      let nx = x;
      let ny = y;
      if (Math.abs(nx - 50) < tolerance) {
        nx = 50;
        hitX = true;
      }
      if (Math.abs(ny - 50) < tolerance) {
        ny = 50;
        hitY = true;
      }
      setSnap({ x: hitX, y: hitY });
      return { x: nx, y: ny };
    },
    [setSnap],
  );

  const spineText = album.spine.show && title && (
    <div
      className="ae-spine-text"
      style={{
        transform: `translate(-50%, -50%) rotate(${
          album.spine.direction === 'ascending' ? -90 : 90
        }deg)`,
        top: `${album.spine.offset}%`,
        fontFamily: fontById(title.font).stack,
        fontSize: spineSize * ppm,
        letterSpacing: '0.02em',
        color: title.color ?? color.ink,
        textTransform: title.uppercase ? 'uppercase' : 'none',
      }}
    >
      {title.text}
      {album.spine.showYear && album.spine.year && (
        <span style={{ opacity: 0.6, marginLeft: '1.2em', fontSize: '0.8em' }}>
          {album.spine.year}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="ae-wrap"
      style={{ width: pageW * 2 + spineW + bleed * 2 * ppm, height: pageH + bleed * 2 * ppm }}
    >
      {/* contracapa — sangra à esquerda; do lado da lombada é dobra */}
      <div
        className="ae-face"
        style={{ width: pageW + bleed * ppm, height: pageH + bleed * 2 * ppm, background: color.bg }}
      >
        {album.back.show && album.back.text && (
          <div
            style={{
              position: 'absolute',
              left: (bleed + SPEC.safe.outer) * ppm,
              right: SPEC.safe.spine * ppm,
              bottom: (bleed + SPEC.safe.bottom) * ppm,
              color: color.ink,
              fontFamily: COVER_FONTS[5].stack,
              fontSize: 3.2 * ppm,
              lineHeight: 1.5,
              opacity: 0.85,
              whiteSpace: 'pre-wrap',
            }}
          >
            {album.back.text}
          </div>
        )}
        <PrintGuides
          ppm={ppm}
          spineSide="right"
          bleed={{ top: true, right: false, bottom: true, left: true }}
          hinge
          show={guides}
        />
      </div>

      {/* lombada */}
      <div
        className="ae-spine"
        style={{ width: spineW, height: pageH + bleed * 2 * ppm, background: color.bg }}
      >
        {spineText}
        <SpineGuides ppm={ppm} show={guides} />
      </div>

      {/* capa — sangra à direita; do lado da lombada é dobra */}
      <div
        className="ae-face"
        style={{ width: pageW + bleed * ppm, height: pageH + bleed * 2 * ppm, background: color.bg }}
      >
        {/* A área final é o que define 0–100% para os elementos. */}
        <div
          className="ae-live"
          style={{ position: 'absolute', left: 0, top: bleed * ppm, width: pageW, height: pageH }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).classList.contains('ae-live')) onSelect(null);
          }}
        >
          {album.elements.map((element) => (
            <CoverElementView
              key={element.id}
              element={element}
              ppm={ppm}
              ink={color.ink}
              paper={color.bg}
              selected={selectedId === element.id}
              live
              onSelect={onSelect}
              onChange={(patch) => onChange(element.id, patch)}
              snapTo={snapTo}
            />
          ))}
          {snap.x && <div className="ae-snap ae-snap-v" />}
          {snap.y && <div className="ae-snap ae-snap-h" />}
        </div>
        <PrintGuides
          ppm={ppm}
          spineSide="left"
          bleed={{ top: true, right: true, bottom: true, left: false }}
          hinge
          show={guides}
        />
      </div>
    </div>
  );
}
