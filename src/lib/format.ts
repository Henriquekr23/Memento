/** Funções utilitárias puras de formatação. Sem dependência de React. */

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

/** Dia por extenso: "terça-feira, 21 de outubro". */
export function formatDayLabel(date: Date): string {
  return dayLabelFormatter.format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'L' : 'O'}`;
  return `${lat}, ${lon}`;
}

/** Converte um texto livre em algo seguro para nome de arquivo/pasta. */
export function slugify(value: string, fallback = 'album'): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : fallback;
}

/**
 * Medida em milímetros, com vírgula decimal e sem zero à toa: 4,6 · 12 · 8,35.
 * A gráfica trabalha em mm — toda medida que aparece na tela passa por aqui.
 */
export function formatMm(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  const trimmed = fixed.includes('.')
    ? fixed.replace(/0+$/, '').replace(/\.$/, '')
    : fixed;
  return trimmed.replace('.', ',');
}
