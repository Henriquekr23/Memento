/**
 * O que o navegador já sabe de cada foto: tamanho natural e se já está
 * decodificada. Módulo, e não estado de componente, porque a mesma foto
 * aparece em vários lugares que montam e desmontam (a folha que vira, a
 * miniatura, a capa do livro) — e cada montagem nova esperava o `onLoad` de
 * novo para saber o tamanho.
 *
 * Sem o tamanho, `FramedPhoto` desenha com `object-fit` e, quando ele chega,
 * troca para a geometria do enquadramento: com zoom ou deslocamento, a foto
 * dava um pulo visível. Com o tamanho guardado, a foto já nasce no lugar.
 *
 * A chave é o `src` inteiro. Por isso quem mostra fotos assinadas mantém a
 * mesma URL durante a sessão (`AlbumViewer`): URL nova seria foto nova aqui e
 * no cache HTTP.
 */

export interface PhotoSize {
  w: number;
  h: number;
}

const sizes = new Map<string, PhotoSize>();
const pending = new Map<string, Promise<void>>();

export function knownSize(src: string | null): PhotoSize | null {
  return src ? sizes.get(src) ?? null : null;
}

export function rememberSize(src: string, w: number, h: number) {
  if (w > 0 && h > 0) sizes.set(src, { w, h });
}

/** Baixa e decodifica uma foto fora da tela; resolve mesmo se ela falhar. */
export function warmPhoto(src: string): Promise<void> {
  if (sizes.has(src)) return Promise.resolve();
  const running = pending.get(src);
  if (running) return running;

  const job = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    const done = () => {
      rememberSize(src, image.naturalWidth, image.naturalHeight);
      pending.delete(src);
      resolve();
    };
    image.onload = () => {
      // `decode()` tira a decodificação do quadro em que a foto aparece: é ela
      // que fazia a folha engasgar no meio da virada.
      image.decode().then(done, done);
    };
    image.onerror = () => {
      pending.delete(src);
      resolve();
    };
    image.src = src;
  });
  pending.set(src, job);
  return job;
}

/**
 * Aquece uma lista de fotos na ordem dada, poucas por vez — a primeira página
 * primeiro, e sem disputar a rede com tudo ao mesmo tempo. `cancelled` para no
 * meio quando quem pediu sai de cena.
 */
export async function warmPhotos(
  srcs: readonly string[],
  cancelled: () => boolean,
  concurrency = 3,
) {
  const queue = [...new Set(srcs)];
  const worker = async () => {
    while (queue.length > 0 && !cancelled()) {
      const next = queue.shift();
      if (next) await warmPhoto(next);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}
