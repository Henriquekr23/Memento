'use client';

import { formatDateTime } from '@/lib/format';
import {
  DEFAULT_ADJUSTMENT,
  ROTATION_RANGE,
  SIZE_RANGE,
  ZOOM_RANGE,
  resolveRotation,
  type ComposeMode,
  type PhotoAdjustment,
  type SlotRect,
} from '@/types/page';
import type { Photo } from '@/types/photo';

interface PhotoInspectorProps {
  photo: Photo;
  adjustment: PhotoAdjustment;
  /** Retângulo efetivo da foto na página (posição livre ou slot do layout). */
  rect: SlotRect | null;
  composeMode: ComposeMode;
  autoTiltEnabled: boolean;
  onAdjust: (photoId: string, patch: Partial<PhotoAdjustment>) => void;
  onPlace: (
    photoId: string,
    rect: SlotRect,
    options?: { bringToFront?: boolean },
  ) => void;
  onReset: (photoId: string) => void;
  onSendToTray: (photoId: string) => void;
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
    <label className="flex min-w-36 flex-1 items-center gap-2 text-xs text-white/60">
      <span className="w-20 shrink-0">{label}</span>
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
  rect,
  composeMode,
  autoTiltEnabled,
  onAdjust,
  onPlace,
  onReset,
  onSendToTray,
  onClose,
}: PhotoInspectorProps) {
  const rotation = resolveRotation(
    photo.id,
    adjustment,
    composeMode === 'free' && autoTiltEnabled,
  );
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

      <div className="flex min-w-64 flex-[2] flex-wrap gap-x-5 gap-y-2">
        {composeMode === 'free' && rect && (
          <Slider
            label="Tamanho"
            value={Math.round(rect.w)}
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            step={SIZE_RANGE.step}
            onChange={(width) =>
              onPlace(photo.id, {
                ...rect,
                w: width,
                h: rect.h * (width / rect.w),
              })
            }
            format={(value) => `${value}%`}
          />
        )}

        <Slider
          label="Zoom"
          value={adjustment.zoom}
          min={ZOOM_RANGE.min}
          max={ZOOM_RANGE.max}
          step={ZOOM_RANGE.step}
          onChange={(value) => onAdjust(photo.id, { zoom: value })}
          format={(value) => `${value.toFixed(1)}×`}
        />

        <div className="flex min-w-56 flex-1 items-center gap-2">
          <Slider
            label="Girar"
            value={rotation}
            min={ROTATION_RANGE.min}
            max={ROTATION_RANGE.max}
            step={ROTATION_RANGE.step}
            onChange={(value) => onAdjust(photo.id, { rotation: value })}
            format={(value) => `${value.toFixed(1)}°`}
          />
          <button
            type="button"
            onClick={() => onAdjust(photo.id, { rotation: 0 })}
            disabled={rotation === 0}
            title="Deixar a foto reta"
            className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-25"
          >
            endireitar
          </button>
        </div>

        <Slider
          label="Enquadrar ⇄"
          value={adjustment.focusX}
          min={0}
          max={100}
          step={1}
          onChange={(value) => onAdjust(photo.id, { focusX: value })}
          format={(value) => `${Math.round(value)}`}
        />

        <Slider
          label="Enquadrar ⇅"
          value={adjustment.focusY}
          min={0}
          max={100}
          step={1}
          onChange={(value) => onAdjust(photo.id, { focusY: value })}
          format={(value) => `${Math.round(value)}`}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onReset(photo.id)}
          disabled={isDefault && composeMode === 'aligned'}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-30"
        >
          Voltar ao padrão
        </button>
        <button
          type="button"
          onClick={() => onSendToTray(photo.id)}
          title="Tira a foto da página e devolve ao depósito, sem apagar"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-amber-400/50 hover:text-amber-200"
        >
          ↑ Depósito
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
        {composeMode === 'free'
          ? 'Arraste a foto para movê-la pela página · ◢ redimensiona · legenda logo abaixo da foto'
          : 'Arraste a foto para reenquadrar · a alça ⠿ troca de lugar com outra · legenda logo abaixo da foto'}
      </p>
    </div>
  );
}
