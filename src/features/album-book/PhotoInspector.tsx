'use client';

import { formatDateTime } from '@/lib/format';
import {
  DEFAULT_ADJUSTMENT,
  ROTATION_RANGE,
  ZOOM_RANGE,
  resolveRotation,
  type PhotoAdjustment,
  type TiltMode,
} from '@/types/page';
import type { Photo } from '@/types/photo';

interface PhotoInspectorProps {
  photo: Photo;
  adjustment: PhotoAdjustment;
  tiltMode: TiltMode;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onReset: (photoId: string) => void;
  onRemoveFromAlbum: (photoId: string) => void;
  onClose: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <label className="flex min-w-40 flex-1 items-center gap-3 text-xs text-white/60">
      <span className="w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
      />
      <span className="w-10 shrink-0 text-right tabular-nums text-white/45">
        {format(value)}
      </span>
    </label>
  );
}

/** Barra de ajuste fino da foto selecionada. */
export function PhotoInspector({
  photo,
  adjustment,
  tiltMode,
  onAdjust,
  onReset,
  onRemoveFromAlbum,
  onClose,
}: PhotoInspectorProps) {
  const rotation = resolveRotation(photo.id, adjustment, tiltMode);
  const isDefault =
    adjustment.focusX === DEFAULT_ADJUSTMENT.focusX &&
    adjustment.focusY === DEFAULT_ADJUSTMENT.focusY &&
    adjustment.zoom === DEFAULT_ADJUSTMENT.zoom &&
    adjustment.rotation === DEFAULT_ADJUSTMENT.rotation;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white" title={photo.fileName}>
            {photo.fileName}
          </p>
          <p className="text-[11px] text-white/40">
            {formatDateTime(photo.timestamp)}
          </p>
        </div>
      </div>

      <Slider
        label="Zoom"
        value={adjustment.zoom}
        min={ZOOM_RANGE.min}
        max={ZOOM_RANGE.max}
        step={ZOOM_RANGE.step}
        onChange={(value) => onAdjust(photo.id, { zoom: value })}
        format={(value) => `${value.toFixed(1)}×`}
      />

      <Slider
        label="Inclinação"
        value={rotation}
        min={ROTATION_RANGE.min}
        max={ROTATION_RANGE.max}
        step={ROTATION_RANGE.step}
        onChange={(value) => onAdjust(photo.id, { rotation: value })}
        format={(value) => `${value.toFixed(1)}°`}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onReset(photo.id)}
          disabled={isDefault}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-30"
        >
          Recentralizar
        </button>
        <button
          type="button"
          onClick={() => onRemoveFromAlbum(photo.id)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-red-400/50 hover:text-red-300"
        >
          Tirar do álbum
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar ajustes"
          className="rounded-full px-2 py-1.5 text-xs text-white/40 transition hover:text-white"
        >
          ✕
        </button>
      </div>

      <p className="w-full text-[11px] text-white/35">
        Arraste a foto na página para reenquadrar · a alça ⠿ no canto troca a foto
        de lugar · escreva a legenda logo abaixo da foto
      </p>
    </div>
  );
}
