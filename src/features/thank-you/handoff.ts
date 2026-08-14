/**
 * A ponte entre a tela do álbum e a página de agradecimento.
 *
 * A rota `/obrigado` é outra página, e na Fase 1 nada é persistido: o álbum
 * montado (arquivos, object URLs, composição) morre na navegação. O que
 * atravessa é só o mínimo para dizer obrigado e montar o texto de
 * compartilhamento — nome, contagens e o cartão já rasterizado.
 *
 * `sessionStorage` e não query string: o cartão é uma imagem de ~200 KB, que não
 * cabe numa URL, e o nome do álbum é assunto de quem montou, não da barra de
 * endereço. Vale só para esta aba e é apagado na leitura, para um F5 não
 * ressuscitar um agradecimento antigo.
 */

const KEY = 'memento:thank-you';

/** Depois disso o dado é lixo esquecido de outra sessão. */
const MAX_AGE_MS = 10 * 60 * 1000;

export interface ThankYouHandoff {
  albumName: string;
  photoCount: number;
  pageCount: number;
  /** Cartão 1200×630 em JPEG (data URL), ou null se não deu para gerar. */
  cardDataUrl: string | null;
  /** `Date.now()` de quando o álbum foi baixado. */
  createdAt: number;
}

export function saveThankYouHandoff(data: Omit<ThankYouHandoff, 'createdAt'>): void {
  // Um álbum novo invalida o que a página de agradecimento já tinha lido: sem
  // isto, baixar um segundo álbum na mesma aba mostraria o primeiro.
  snapshot = undefined;

  const payload: ThankYouHandoff = { ...data, createdAt: Date.now() };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Cota estourada (cartão grande demais, aba com muita coisa guardada): a
    // página de agradecimento ainda funciona sem o cartão, então tenta de novo
    // sem ele em vez de derrubar o download que acabou de dar certo.
    try {
      window.sessionStorage.setItem(
        KEY,
        JSON.stringify({ ...payload, cardDataUrl: null }),
      );
    } catch {
      /* Sem sessionStorage (modo restrito): a página cai no texto genérico. */
    }
  }
}

/**
 * O que já foi lido nesta navegação.
 *
 * `undefined` = ainda não leu; `null` = leu e não havia nada. A distinção
 * importa porque a leitura **apaga** o registro: sem cache, cada render pediria
 * de novo e receberia `null` a partir do segundo.
 */
let snapshot: ThankYouHandoff | null | undefined;

/**
 * Instantâneo para `useSyncExternalStore`.
 *
 * O `sessionStorage` é um sistema externo ao React: ler no efeito e chamar
 * `setState` provoca render em cascata (e o lint do React 19 reprova). Aqui o
 * React lê o valor real do cliente já na hidratação, com `null` como
 * instantâneo do servidor — a página é HTML estático no build, onde não existe
 * `sessionStorage`.
 */
export function getThankYouSnapshot(): ThankYouHandoff | null {
  if (snapshot === undefined) snapshot = takeThankYouHandoff();
  return snapshot;
}

export function getThankYouServerSnapshot(): ThankYouHandoff | null {
  return null;
}

/** Nada externo muda depois da leitura: assinar é um contrato vazio. */
export function subscribeThankYou(): () => void {
  return () => {};
}

/** Lê e apaga. Devolve `null` quando não há nada válido guardado. */
export function takeThankYouHandoff(): ThankYouHandoff | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ThankYouHandoff>;
    if (
      typeof parsed.albumName !== 'string' ||
      typeof parsed.photoCount !== 'number' ||
      typeof parsed.pageCount !== 'number' ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > MAX_AGE_MS
    ) {
      return null;
    }
    return {
      albumName: parsed.albumName,
      photoCount: parsed.photoCount,
      pageCount: parsed.pageCount,
      cardDataUrl: typeof parsed.cardDataUrl === 'string' ? parsed.cardDataUrl : null,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}
