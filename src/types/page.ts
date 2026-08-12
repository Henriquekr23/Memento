/** Layouts de página, posicionamento e ajustes por foto — o "miolo" do álbum. */

export type PageLayoutId =
  | 'single'
  | 'duo-vertical'
  | 'duo-horizontal'
  | 'trio'
  | 'quad';

/**
 * Retângulo em porcentagem da área útil da página.
 * Layout é *dado*, não classe de CSS: a mesma geometria serve para desenhar a
 * página alinhada e para dar a posição inicial de cada foto no modo livre.
 * Criar um template novo é acrescentar um objeto aqui.
 */
export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageLayout {
  id: PageLayoutId;
  label: string;
  capacity: number;
  slots: SlotRect[];
}

/** A página é retrato (mais alta que larga), então os defaults favorecem empilhar. */
export const PAGE_LAYOUTS: Record<PageLayoutId, PageLayout> = {
  single: {
    id: 'single',
    label: '1 foto',
    capacity: 1,
    slots: [{ x: 0, y: 0, w: 100, h: 100 }],
  },
  'duo-vertical': {
    id: 'duo-vertical',
    label: '2 empilhadas',
    capacity: 2,
    slots: [
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 50, w: 100, h: 50 },
    ],
  },
  'duo-horizontal': {
    id: 'duo-horizontal',
    label: '2 lado a lado',
    capacity: 2,
    slots: [
      { x: 0, y: 0, w: 50, h: 100 },
      { x: 50, y: 0, w: 50, h: 100 },
    ],
  },
  trio: {
    id: 'trio',
    label: '3 fotos',
    capacity: 3,
    slots: [
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 50, w: 50, h: 50 },
      { x: 50, y: 50, w: 50, h: 50 },
    ],
  },
  quad: {
    id: 'quad',
    label: '4 fotos',
    capacity: 4,
    slots: [
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 50, y: 0, w: 50, h: 50 },
      { x: 0, y: 50, w: 50, h: 50 },
      { x: 50, y: 50, w: 50, h: 50 },
    ],
  },
};

export const PAGE_LAYOUT_IDS = Object.keys(PAGE_LAYOUTS) as PageLayoutId[];

/**
 * Como as fotos são dispostas na página.
 * - `aligned`: encaixadas nos slots do layout, tudo reto;
 * - `free` (o "espontâneo"): o usuário move, redimensiona e inclina cada foto
 *   onde quiser, e quem não foi movida ganha uma inclinação leve.
 */
export type ComposeMode = 'aligned' | 'free';

/** Posição escolhida à mão, em % da área útil da página. */
export interface PhotoPlacement extends SlotRect {
  /** Ordem de empilhamento: quem foi mexido por último fica por cima. */
  z: number;
}

/**
 * Ajuste da imagem dentro da moldura.
 * `focusX/focusY` viram `object-position`, que já é clampado pelo navegador —
 * é impossível arrastar a ponto de aparecer buraco no enquadramento.
 */
export interface PhotoAdjustment {
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
export const ROTATION_RANGE = { min: -45, max: 45, step: 0.5 } as const;
export const SIZE_RANGE = { min: 15, max: 100, step: 1 } as const;

/** Perto o bastante de reto para valer a pena grudar no zero. */
export const ROTATION_SNAP_DEGREES = 2.5;

/** Fotos "coladas tortas": inclinação estável derivada do id, sem sorteio. */
export function autoTilt(photoId: string): number {
  let hash = 0;
  for (let i = 0; i < photoId.length; i += 1) {
    hash = (hash * 31 + photoId.charCodeAt(i)) | 0;
  }
  // -3.5 a 3.5 graus, em passos de 0.5
  return ((Math.abs(hash) % 15) - 7) / 2;
}

/**
 * Rotação efetiva da foto.
 * O ajuste manual sempre vence — inclusive quando é 0: quem endireitou a foto
 * não quer que ela volte a torta.
 */
export function resolveRotation(
  photoId: string,
  adjustment: PhotoAdjustment,
  useAutoTilt: boolean,
): number {
  if (adjustment.rotation !== null) return adjustment.rotation;
  return useAutoTilt ? autoTilt(photoId) : 0;
}

export function clampRotation(degrees: number): number {
  const snapped =
    Math.abs(degrees) < ROTATION_SNAP_DEGREES ? 0 : degrees;
  return Math.min(ROTATION_RANGE.max, Math.max(ROTATION_RANGE.min, snapped));
}

export function clampRect(rect: SlotRect): SlotRect {
  const w = Math.min(100, Math.max(SIZE_RANGE.min, rect.w));
  const h = Math.min(100, Math.max(SIZE_RANGE.min, rect.h));
  return {
    w,
    h,
    x: Math.min(100 - w, Math.max(0, rect.x)),
    y: Math.min(100 - h, Math.max(0, rect.y)),
  };
}
