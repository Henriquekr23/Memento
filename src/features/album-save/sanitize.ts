/**
 * O que se confere em tudo que chega do navegador antes de virar linha.
 *
 * Vive fora dos `actions.ts` porque um módulo `'use server'` só pode exportar
 * funções `async` — uma `const` ou uma função síncrona ali derrubam o build
 * inteiro. Mesmo motivo de `album-contrib/contract.ts`.
 *
 * Estas conferências não são a autorização (quem autoriza é a RLS) e não são o
 * limite de verdade (o limite está nas `check constraint` e nos gatilhos de
 * `schema.sql`, onde uma chamada direta ao PostgREST não escapa). Elas existem
 * para o pedido errado morrer com uma frase legível.
 */

/**
 * Teto de fotos por álbum.
 *
 * Não é limite de produto — é limite de requisição. A lista de fotos vem do
 * navegador, e uma chamada forjada com dezenas de milhares de itens viraria um
 * `insert` gigante contra o banco do free tier. Nenhum álbum de verdade chega
 * perto disso; um pedido que chega, chega errado.
 */
export const MAX_PHOTOS_PER_ALBUM = 500;

/** Título vazio não ajuda ninguém a se achar na lista. */
export function cleanTitle(title: string): string {
  const trimmed = String(title ?? '').trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : 'Álbum sem nome';
}

/** Inteiro não-negativo, ou `null`. Número vindo do cliente pode ser qualquer coisa. */
export function safeInt(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= max ? rounded : null;
}

/** Data em ISO, ou `null`. */
export function safeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** O formato de id que `album_photos` aceita — o `check` da tabela em TypeScript. */
export function isPhotoId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 64;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
