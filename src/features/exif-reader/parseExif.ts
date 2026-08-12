import exifr from 'exifr';

import type { PhotoExif } from '@/types/photo';

/**
 * Leitura e normalização de metadados EXIF.
 *
 * Módulo puro e isolado: não conhece React nem o estado do álbum.
 * Fase 2: se a extração passar a acontecer no servidor, só a chamada muda —
 * o formato de saída (`PhotoExif`) permanece o mesmo.
 */

const EMPTY_EXIF: PhotoExif = {
  takenAt: null,
  gps: null,
  cameraMake: null,
  cameraModel: null,
  width: null,
  height: null,
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toGps(raw: Record<string, unknown>): PhotoExif['gps'] {
  const latitude = toFiniteNumber(raw.latitude);
  const longitude = toFiniteNumber(raw.longitude);
  if (latitude === null || longitude === null) return null;
  // (0, 0) na prática significa "sem sinal de GPS" em quase todo dispositivo.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

/**
 * Extrai o EXIF de um arquivo de imagem no navegador.
 * Nunca lança: arquivos sem EXIF ou corrompidos retornam metadados vazios.
 */
export async function parseExif(file: File): Promise<PhotoExif> {
  try {
    const raw = (await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
    })) as Record<string, unknown> | undefined;

    if (!raw) return { ...EMPTY_EXIF };

    return {
      takenAt:
        toDate(raw.DateTimeOriginal) ??
        toDate(raw.CreateDate) ??
        toDate(raw.ModifyDate),
      gps: toGps(raw),
      cameraMake: toTrimmedString(raw.Make),
      cameraModel: toTrimmedString(raw.Model),
      width: toFiniteNumber(raw.ExifImageWidth) ?? toFiniteNumber(raw.ImageWidth),
      height:
        toFiniteNumber(raw.ExifImageHeight) ?? toFiniteNumber(raw.ImageHeight),
    };
  } catch {
    return { ...EMPTY_EXIF };
  }
}

export { EMPTY_EXIF };
