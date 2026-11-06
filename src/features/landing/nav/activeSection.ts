/**
 * Qual seção está "na tela" para o menu — função pura.
 *
 * A linha de leitura fica a 40% da altura da janela: a seção ativa é a última
 * cujo topo já passou dela. No fim da página a última seção vale mesmo que o
 * topo dela não alcance a linha (o rodapé pode ser curto demais para isso).
 */
export function activeSectionAt(
  tops: readonly number[],
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
): number {
  if (tops.length === 0) return 0;
  if (scrollY + viewportHeight >= documentHeight - 2) return tops.length - 1;
  const line = scrollY + viewportHeight * 0.4;
  let active = 0;
  tops.forEach((top, index) => {
    if (top <= line) active = index;
  });
  return active;
}
