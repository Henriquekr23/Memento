/**
 * O cartão do álbum: uma imagem 1200×630 desenhada em canvas, com o nome, a
 * contagem e até três fotos do próprio álbum como prancha colada.
 *
 * Por que existe: em rede social o que para a rolagem é imagem, não texto. E
 * como nada é publicado na Fase 1, o cartão é a única coisa que dá para mostrar
 * sem expor as fotos — quem escolhe se ele vai ou não é a pessoa.
 *
 * 1200×630 é a proporção que X, WhatsApp e Telegram usam para prévia de link;
 * o mesmo arquivo serve para os três.
 *
 * Tudo local: as fotos entram por object URL da própria máquina, o canvas não é
 * "tainted" (nada de origem externa), e por isso `toDataURL` funciona.
 */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

/** Cores fixas, não as do tema: o cartão vai para fora do site. */
const PAPER = '#f3f2f2';
const INK = '#201f1d';
const ACCENT = '#b68235';
const FRAME = '#eae9e9';

export interface ShareCardInput {
  albumName: string;
  photoCount: number;
  pageCount: number;
  /** Object URLs das fotos que vão aparecer. Só as três primeiras são usadas. */
  previewUrls: readonly string[];
  lang: 'pt' | 'en';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    // Uma foto que não abre não pode derrubar o cartão: o desenho segue sem ela.
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Desenha a imagem cobrindo o retângulo, cortando o excesso (object-fit: cover). */
function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

/** Uma prancha inclinada: moldura clara, foto dentro, sombra curta. */
function drawPlate(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  cx: number,
  cy: number,
  width: number,
  height: number,
  tiltDegrees: number,
): void {
  const inset = 14;

  context.save();
  context.translate(cx, cy);
  context.rotate((tiltDegrees * Math.PI) / 180);

  context.shadowColor = 'rgba(45, 43, 43, 0.28)';
  context.shadowBlur = 26;
  context.shadowOffsetY = 10;
  context.fillStyle = FRAME;
  context.fillRect(-width / 2, -height / 2, width, height);
  context.shadowColor = 'transparent';

  const photoX = -width / 2 + inset;
  const photoY = -height / 2 + inset;
  const photoWidth = width - inset * 2;
  const photoHeight = height - inset * 2 - 26;

  if (image) {
    drawCover(context, image, photoX, photoY, photoWidth, photoHeight);
  } else {
    context.fillStyle = '#d7d3d3';
    context.fillRect(photoX, photoY, photoWidth, photoHeight);
  }

  context.restore();
}

/** Corta o texto com reticências quando ele passa da largura disponível. */
function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) return text;

  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/**
 * Gera o cartão e devolve um data URL JPEG.
 *
 * Data URL, e não Blob, porque o cartão atravessa uma navegação: quem o recebe
 * é a página de agradecimento, e object URL morre junto com o documento que o
 * criou. `dataUrlToBlob` faz o caminho de volta quando o compartilhamento
 * nativo precisa de arquivo.
 */
export async function buildShareCard(input: ShareCardInput): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = PAPER;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Filete de acento na borda de baixo: a assinatura visual do site.
  context.fillStyle = ACCENT;
  context.fillRect(0, CARD_HEIGHT - 8, CARD_WIDTH, 8);

  const images = await Promise.all(input.previewUrls.slice(0, 3).map(loadImage));

  // As pranchas ficam à direita, da menor para a maior, sobrepostas como fotos
  // deixadas em cima da mesa.
  drawPlate(context, images[2] ?? null, 830, 200, 210, 250, -8);
  drawPlate(context, images[1] ?? null, 1020, 400, 240, 285, 7);
  drawPlate(context, images[0] ?? null, 900, 400, 300, 350, -3);

  const isPt = input.lang === 'pt';
  const marginLeft = 78;
  const textWidth = 600;

  context.fillStyle = ACCENT;
  context.font = '600 22px Georgia, "Times New Roman", serif';
  context.fillText('MEMENTO', marginLeft, 118);

  context.fillStyle = INK;
  context.font = '600 30px Georgia, "Times New Roman", serif';
  context.globalAlpha = 0.55;
  context.fillText(isPt ? 'Guarde a memória' : 'Keep the Memory', marginLeft, 162);
  context.globalAlpha = 1;

  const name = input.albumName.trim() || (isPt ? 'Meu álbum' : 'My album');
  context.font = '600 64px Georgia, "Times New Roman", serif';
  context.fillText(fitText(context, name, textWidth), marginLeft, 300);

  const photos = isPt
    ? `${input.photoCount} ${input.photoCount === 1 ? 'foto' : 'fotos'}`
    : `${input.photoCount} ${input.photoCount === 1 ? 'photo' : 'photos'}`;
  const pages = isPt
    ? `${input.pageCount} ${input.pageCount === 1 ? 'página' : 'páginas'}`
    : `${input.pageCount} ${input.pageCount === 1 ? 'page' : 'pages'}`;

  context.font = '400 30px Georgia, "Times New Roman", serif';
  context.globalAlpha = 0.7;
  context.fillText(`${photos} · ${pages}`, marginLeft, 366);
  context.fillText(
    isPt ? 'Em ordem, do jeito que aconteceu.' : 'In order, the way it happened.',
    marginLeft,
    416,
  );
  context.globalAlpha = 1;

  context.fillStyle = ACCENT;
  context.font = '600 26px Georgia, "Times New Roman", serif';
  context.fillText('memento.vercel.app', marginLeft, 520);

  // 0.82 mantém o arquivo perto de 200 KB — cabe no sessionStorage, que é onde
  // ele espera a próxima página, e é mais que suficiente para uma prévia.
  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Data URL de volta para Blob, sem `fetch`.
 *
 * `fetch('data:…')` seria mais curto, mas a CSP do projeto tem `connect-src
 * 'self'` — e é bom que tenha: é ela que garante que nenhuma foto sai da
 * máquina. Decodificar com `atob` não depende de rede nenhuma.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const [header, base64] = dataUrl.split(',');
  if (!header || !base64) return null;

  const type = header.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}
