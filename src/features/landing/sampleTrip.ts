/**
 * A viagem de exemplo da landing: doze fotos de nove dias no Chile, de 14 a 22
 * de março de 2026.
 *
 * As imagens moram em `public/landing/` (mesma origem — a CSP `img-src 'self'`
 * continua valendo) e são marcadores de lugar: paisagens desenhadas, 800×600.
 * TODO: trocar por fotos reais (do dono do projeto ou com licença livre,
 * baixadas para o repositório), mantendo nome de arquivo e proporção 4:3.
 *
 * Data, hora e coordenadas são as que a câmera teria gravado. A landing passa
 * estas fotos pela **mesma** ordem e pelo **mesmo** agrupamento por dia do
 * álbum de verdade (`lib/sortPhotos.ts`), e não por uma lista de dias escrita
 * à mão — o que a seção "Da bagunça ao álbum" demonstra é o que o produto faz.
 * Na Fase 2, o mesmo componente pode receber as fotos da própria pessoa.
 */

import type { GpsCoordinates } from '@/types/photo';

export interface SamplePhoto {
  id: string;
  /** Caminho servido de `public/`. */
  src: string;
  /** O nome que a câmera deu ao arquivo — o "antes" da história. */
  fileName: string;
  place: string;
  /** Quando a foto foi tirada, no horário local da viagem. */
  timestamp: Date;
  gps: GpsCoordinates;
}

/** Largura e altura de todos os arquivos de `public/landing/`. */
export const SAMPLE_PHOTO_SIZE = { width: 800, height: 600 } as const;

function photo(
  id: string,
  fileName: string,
  place: string,
  [day, hour, minute]: [number, number, number],
  [latitude, longitude]: [number, number],
): SamplePhoto {
  return {
    id,
    src: `/landing/${id}.jpg`,
    fileName,
    place,
    // Construída por componentes locais: dia, hora e dia da semana saem iguais
    // no servidor e no navegador, qualquer que seja o fuso de cada um.
    timestamp: new Date(2026, 2, day, hour, minute),
    gps: { latitude, longitude },
  };
}

export const SAMPLE_TRIP: readonly SamplePhoto[] = [
  photo('janela-aviao', 'IMG_0093.jpg', 'Santiago', [14, 7, 12], [-33.393, -70.786]),
  photo('santiago', 'IMG_0131.jpg', 'Santiago', [14, 19, 48], [-33.417, -70.606]),
  photo('valparaiso', 'IMG_1187.jpg', 'Valparaíso', [15, 11, 20], [-33.046, -71.619]),
  photo('pacifico', 'IMG_1342.jpg', 'Viña del Mar', [15, 20, 5], [-33.024, -71.552]),
  photo('atacama-dunas', 'IMG_4821.jpg', 'Valle de la Luna', [17, 13, 34], [-22.917, -68.278]),
  photo('laguna-amanhecer', 'IMG_5019.jpg', 'Salar de Atacama', [18, 6, 52], [-23.301, -68.204]),
  photo('noite-deserto', 'IMG_5108.jpg', 'San Pedro', [18, 23, 41], [-22.909, -68.2]),
  photo('geiseres', 'IMG_5275.jpg', 'Geysers del Tatio', [19, 7, 3], [-22.333, -68.011]),
  photo('estrada-carretera', 'IMG_7034.jpg', 'Ruta 9', [20, 16, 18], [-51.727, -72.506]),
  photo('torres-del-paine', 'IMG_8650.jpg', 'Torres del Paine', [21, 8, 27], [-50.942, -72.969]),
  photo('lago-pehoe', 'IMG_2210.jpg', 'Lago Pehoé', [21, 15, 2], [-51.077, -73.001]),
  photo('glaciar-grey', 'IMG_8811.jpg', 'Glaciar Grey', [22, 12, 16], [-51.004, -73.201]),
];

export function samplePhoto(id: string): SamplePhoto {
  const found = SAMPLE_TRIP.find((item) => item.id === id);
  if (!found) throw new Error(`Foto de exemplo inexistente: ${id}`);
  return found;
}

/**
 * O carimbo de data das câmeras de filme: `'26 3 15` — ano com apóstrofo,
 * mês e dia sem zero à esquerda. Com hora, dois espaços: `'26 3 15  11:20`.
 */
export function filmStamp(date: Date, withTime = false): string {
  const base = `'${String(date.getFullYear()).slice(-2)} ${date.getMonth() + 1} ${date.getDate()}`;
  if (!withTime) return base;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Quantos dias de calendário a viagem cobre, do primeiro ao último, inclusive. */
export function daySpan(photos: readonly { timestamp: Date }[]): number {
  if (photos.length === 0) return 0;
  const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  const days = photos.map((p) => dayNumber(p.timestamp));
  return Math.max(...days) - Math.min(...days) + 1;
}

/** "sáb 14": dia da semana abreviado (vindo da copy, por idioma) e dia do mês. */
export function shortDayLabel(date: Date, weekdays: readonly string[]): string {
  return `${weekdays[date.getDay()]} ${date.getDate()}`;
}

/** "33.046° S, 71.619° O": três casas, como a tela de detalhes de uma câmera. */
export function shortCoordinates(
  { latitude, longitude }: GpsCoordinates,
  compass: { north: string; south: string; east: string; west: string },
): string {
  const lat = `${Math.abs(latitude).toFixed(3)}° ${latitude >= 0 ? compass.north : compass.south}`;
  const lon = `${Math.abs(longitude).toFixed(3)}° ${longitude >= 0 ? compass.east : compass.west}`;
  return `${lat}, ${lon}`;
}
