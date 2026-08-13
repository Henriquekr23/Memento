import type { Photo } from '@/types/photo';

/**
 * Lógica de ordenação — funções puras, sem React e sem I/O.
 * É o coração do produto e a parte que menos deve mudar entre as fases.
 */

export type SortDirection = 'asc' | 'desc';

const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

/** Comparador cronológico com desempate estável pelo nome do arquivo. */
export function comparePhotosByDate(a: Photo, b: Photo): number {
  const diff = a.timestamp.getTime() - b.timestamp.getTime();
  if (diff !== 0) return diff;
  return collator.compare(a.fileName, b.fileName);
}

export function sortPhotosChronologically(
  photos: readonly Photo[],
  direction: SortDirection = 'asc',
): Photo[] {
  const sorted = [...photos].sort(comparePhotosByDate);
  return direction === 'asc' ? sorted : sorted.reverse();
}

/** Chave de dia local (YYYY-MM-DD), sem depender de fuso UTC. */
export function toDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface DayGroup {
  key: string;
  date: Date;
  photos: Photo[];
}

/**
 * Agrupa por dia preservando a ordem atual da lista (não reordena).
 * Usado só para exibir rótulos de "dia do álbum".
 */
export function groupPhotosByDay(photos: readonly Photo[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const photo of photos) {
    const key = toDayKey(photo.timestamp);
    const existing = groups.get(key);
    if (existing) {
      existing.photos.push(photo);
    } else {
      groups.set(key, { key, date: photo.timestamp, photos: [photo] });
    }
  }

  return [...groups.values()];
}

/**
 * Número do dia do álbum (1, 2, 3...) para cada foto, considerando o dia
 * mais antigo do álbum como dia 1. Independe da ordem manual escolhida.
 */
export function buildDayIndex(photos: readonly Photo[]): Map<string, number> {
  const uniqueDays = [...new Set(photos.map((p) => toDayKey(p.timestamp)))].sort();
  return new Map(uniqueDays.map((key, index) => [key, index + 1]));
}
