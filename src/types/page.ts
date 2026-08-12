/** Layouts de página e ajustes por foto — o "miolo" do álbum. */

export type PageLayoutId =
  | 'single'
  | 'duo-vertical'
  | 'duo-horizontal'
  | 'trio'
  | 'quad';

export interface PageLayout {
  id: PageLayoutId;
  label: string;
  capacity: number;
  /** Classes do grid da página. */
  gridClassName: string;
  /** Classe extra por slot (índice do slot). */
  slotClassNames: string[];
}

/** A página é retrato (mais alta que larga), então os defaults favorecem empilhar. */
export const PAGE_LAYOUTS: Record<PageLayoutId, PageLayout> = {
  single: {
    id: 'single',
    label: '1 foto',
    capacity: 1,
    gridClassName: 'grid-cols-1 grid-rows-1',
    slotClassNames: [''],
  },
  'duo-vertical': {
    id: 'duo-vertical',
    label: '2 empilhadas',
    capacity: 2,
    gridClassName: 'grid-cols-1 grid-rows-2',
    slotClassNames: ['', ''],
  },
  'duo-horizontal': {
    id: 'duo-horizontal',
    label: '2 lado a lado',
    capacity: 2,
    gridClassName: 'grid-cols-2 grid-rows-1',
    slotClassNames: ['', ''],
  },
  trio: {
    id: 'trio',
    label: '3 fotos',
    capacity: 3,
    gridClassName: 'grid-cols-2 grid-rows-2',
    slotClassNames: ['col-span-2', '', ''],
  },
  quad: {
    id: 'quad',
    label: '4 fotos',
    capacity: 4,
    gridClassName: 'grid-cols-2 grid-rows-2',
    slotClassNames: ['', '', '', ''],
  },
};

export const PAGE_LAYOUT_IDS = Object.keys(PAGE_LAYOUTS) as PageLayoutId[];

/**
 * Ajuste de uma foto dentro do slot.
 * `focusX/focusY` viram `object-position`, que já é clampado pelo navegador —
 * é impossível o usuário arrastar a ponto de aparecer buraco no enquadramento.
 */
export interface PhotoAdjustment {
  /** 0–100, ponto da imagem que fica centralizado no slot. */
  focusX: number;
  focusY: number;
  /** 1–2.5 */
  zoom: number;
  /** Graus. `null` = usa a inclinação automática do modo espontâneo. */
  rotation: number | null;
}

export const DEFAULT_ADJUSTMENT: PhotoAdjustment = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
  rotation: null,
};

export const ZOOM_RANGE = { min: 1, max: 2.5, step: 0.05 } as const;
export const ROTATION_RANGE = { min: -8, max: 8, step: 0.5 } as const;

/** Fotos "coladas tortas": inclinação estável derivada do id, sem aleatório a cada render. */
export function autoTilt(photoId: string): number {
  let hash = 0;
  for (let i = 0; i < photoId.length; i += 1) {
    hash = (hash * 31 + photoId.charCodeAt(i)) | 0;
  }
  // -3.5 a 3.5 graus, em passos de 0.5
  return ((Math.abs(hash) % 15) - 7) / 2;
}

export type TiltMode = 'aligned' | 'scattered';

export function resolveRotation(
  photoId: string,
  adjustment: PhotoAdjustment,
  tiltMode: TiltMode,
): number {
  if (adjustment.rotation !== null) return adjustment.rotation;
  return tiltMode === 'scattered' ? autoTilt(photoId) : 0;
}
