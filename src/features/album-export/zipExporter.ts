import JSZip from 'jszip';

import {
  fileNameTimestamp,
  formatCoordinates,
  formatDateTime,
  sanitizeFileName,
  slugify,
} from '@/lib/format';
import { buildTripDayIndex, toDayKey } from '@/lib/sortPhotos';
import type { Photo } from '@/types/photo';

import type { AlbumExporter, AlbumSnapshot, ExportProgress } from './types';

/** 001_2026-05-12_14h30_praia.jpg */
export function buildPhotoFileName(photo: Photo, position: number): string {
  const prefix = String(position).padStart(3, '0');
  const stamp =
    photo.timestampSource === 'exif'
      ? fileNameTimestamp(photo.timestamp)
      : 'sem-data';
  const original = photo.fileName.replace(/\.[^.]+$/, '');
  const base = sanitizeFileName(`${prefix}_${stamp}_${original}`).slice(0, 120);
  return `${base}.${photo.extension}`;
}

/** Índice em texto puro, para o usuário saber o que tem no ZIP. */
export function buildIndexFile(album: AlbumSnapshot): string {
  const tripDays = buildTripDayIndex(album.photos);
  const lines: string[] = [
    `Memento — ${album.name || 'Álbum sem nome'}`,
    `${album.photos.length} foto(s)`,
    `Gerado em ${formatDateTime(new Date())}`,
    '',
  ];

  album.photos.forEach((photo, index) => {
    const day = tripDays.get(toDayKey(photo.timestamp));
    const caption = album.photoCaptions?.[photo.id]?.trim();
    lines.push(
      `${String(index + 1).padStart(3, '0')}. ${buildPhotoFileName(photo, index + 1)}`,
    );
    if (caption) lines.push(`     "${caption}"`);
    lines.push(
      `     Dia ${day ?? '?'} · ${formatDateTime(photo.timestamp)}` +
        (photo.timestampSource === 'file' ? ' (data do arquivo, sem EXIF)' : ''),
    );
    if (photo.exif.gps) {
      lines.push(
        `     GPS: ${formatCoordinates(
          photo.exif.gps.latitude,
          photo.exif.gps.longitude,
        )}`,
      );
    }
    if (photo.exif.cameraModel) {
      lines.push(
        `     Câmera: ${[photo.exif.cameraMake, photo.exif.cameraModel]
          .filter(Boolean)
          .join(' ')}`,
      );
    }
    lines.push(`     Original: ${photo.fileName}`);
    lines.push('');
  });

  // O texto escrito pelo usuário não pode ficar preso no navegador.
  const stories = (album.stories ?? []).filter(
    (story) => story.title.trim() || story.body.trim(),
  );

  if (stories.length > 0) {
    lines.push('');
    lines.push('── Páginas de texto ──────────────────────────────');
    lines.push('');
    for (const story of stories) {
      if (story.title.trim()) lines.push(story.title.trim());
      if (story.body.trim()) lines.push(story.body.trim());
      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function buildAlbumZip(
  album: AlbumSnapshot,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const folderName = slugify(album.name, 'meu-album');
  const folder = zip.folder(folderName) ?? zip;

  album.photos.forEach((photo, index) => {
    folder.file(buildPhotoFileName(photo, index + 1), photo.file);
    onProgress?.({ processed: index + 1, total: album.photos.length });
  });

  folder.file('indice.txt', buildIndexFile(album));

  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const zipAlbumExporter: AlbumExporter = {
  id: 'zip',
  label: 'Baixar ZIP',
  async export(album, onProgress) {
    const blob = await buildAlbumZip(album, onProgress);
    downloadBlob(blob, `${slugify(album.name, 'meu-album')}.zip`);
  },
};
