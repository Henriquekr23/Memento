/**
 * A ordem da etapa "Confira a ordem" — função pura, sem React.
 *
 * Aqui reordenar é **inserir**, não trocar: é uma fila de fotos, e quem pega uma
 * foto e solta entre duas espera que ela fique ali e o resto ande. (Trocar é o
 * gesto das páginas, na etapa seguinte, onde cada quadro é um lugar.)
 */

export type Side = 'before' | 'after';

/**
 * A lista com `id` tirado de onde estava e posto antes ou depois de
 * `targetId`. Vale para a lista inteira do acervo — fotos fora do álbum
 * continuam onde estavam, só não contam como referência visível.
 */
export function moveNextTo(
  ids: readonly string[],
  id: string,
  targetId: string,
  side: Side,
): string[] {
  if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return [...ids];
  const rest = ids.filter((value) => value !== id);
  const at = rest.indexOf(targetId) + (side === 'after' ? 1 : 0);
  rest.splice(at, 0, id);
  return rest;
}
