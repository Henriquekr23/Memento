/**
 * Para onde é seguro voltar depois do login.
 *
 * O `next` chega pelo navegador (query string ou campo escondido de
 * formulário), então é entrada hostil: sem filtro, `/entrar?next=https://…`
 * transformaria a própria tela de login numa página de redirecionamento aberto
 * — o cenário clássico de phishing, em que o link começa no domínio de verdade
 * e termina num clone.
 *
 * Só passa caminho interno, e a checagem é mais estrita do que parece:
 *
 * - `//evil.com` é URL protocolo-relativa, não caminho;
 * - `/\evil.com` e `/\/evil.com` também não: os navegadores normalizam a barra
 *   invertida para barra comum antes de resolver o endereço, então isso vira
 *   `//evil.com` na prática. É o desvio que derruba a checagem ingênua de
 *   "começa com `/` e não começa com `//`";
 * - quebras de linha e caracteres de controle saem fora — eles servem para
 *   contrabandear cabeçalho dentro do `Location` da resposta.
 *
 * Qualquer coisa fora disso vira o destino padrão, que é uma tela do próprio
 * app: recusar redirecionando para casa é mais útil do que dar erro.
 */

/** Destino quando o pedido não é confiável. */
export const DEFAULT_NEXT = '/albums';

/** Espaço, tab, CR, LF e qualquer outro caractere de controle. */
const CONTROL_CHARS = /[\u0000-\u0020\u007f]/;

export function safeNext(raw: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof raw !== 'string') return fallback;
  if (CONTROL_CHARS.test(raw)) return fallback;

  // Barra invertida é barra comum para o navegador: trate as duas igual antes
  // de decidir, senão `/\evil.com` passa como se fosse caminho interno.
  const normalized = raw.replace(/\\/g, '/');

  if (!normalized.startsWith('/')) return fallback;
  if (normalized.startsWith('//')) return fallback;

  return normalized;
}
