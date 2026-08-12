import { parseExif } from '@/features/exif-reader/parseExif';
import type { Photo } from '@/types/photo';

/**
 * Converte arquivos brutos em objetos `Photo` do domínio.
 * Roda 100% no navegador: nenhum byte da foto sai da máquina do usuário.
 */

export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/heif',
] as const;

const ACCEPTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'tif',
  'tiff',
  'heic',
  'heif',
];

export function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index > 0 ? fileName.slice(index + 1).toLowerCase() : '';
}

export function isSupportedImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  // Alguns sistemas não preenchem o MIME de HEIC — cai no fallback por extensão.
  return ACCEPTED_EXTENSIONS.includes(getExtension(file.name));
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `photo_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function toPhoto(file: File): Promise<Photo> {
  const exif = await parseExif(file);
  const hasExifDate = exif.takenAt !== null;

  return {
    id: createId(),
    file,
    fileName: file.name,
    extension: getExtension(file.name) || 'jpg',
    sizeInBytes: file.size,
    previewUrl: URL.createObjectURL(file),
    exif,
    timestamp: hasExifDate ? (exif.takenAt as Date) : new Date(file.lastModified),
    timestampSource: hasExifDate ? 'exif' : 'file',
    included: true,
  };
}

export interface ImportProgress {
  processed: number;
  total: number;
}

export interface ImportResult {
  photos: Photo[];
  /** Arquivos ignorados por não serem imagens suportadas. */
  rejectedFileNames: string[];
}

const CONCURRENCY = 4;

/**
 * Lê os arquivos em pequenos lotes para não travar a aba com centenas de fotos.
 */
export async function importPhotos(
  files: readonly File[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const accepted: File[] = [];
  const rejectedFileNames: string[] = [];

  for (const file of files) {
    if (isSupportedImage(file)) accepted.push(file);
    else rejectedFileNames.push(file.name);
  }

  const photos: Photo[] = new Array(accepted.length);
  let processed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < accepted.length) {
      const index = cursor++;
      photos[index] = await toPhoto(accepted[index]);
      processed += 1;
      onProgress?.({ processed, total: accepted.length });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, accepted.length) }, worker),
  );

  return { photos, rejectedFileNames };
}
