/**
 * O texto que sai daqui para o X, o WhatsApp, o Telegram ou o e-mail.
 *
 * Função pura de dados em texto, sem React e sem `window`: dá para testar fora
 * do navegador e é ela que garante que a mesma frase apareça em todos os
 * destinos — cada botão montando o seu texto viraria cinco frases diferentes.
 *
 * O que **não** vai no texto: as fotos e o álbum. Na Fase 1 nada é publicado,
 * então o link convida a montar o próprio álbum. Quando a Fase 2 trouxer link
 * público, é aqui que ele entra — e nenhum botão muda.
 */

import type { Lang } from '@/features/i18n/lang';
import { SITE_URL } from '@/lib/site';

export interface ShareFacts {
  /** Nome dado ao álbum. Vazio é tratado como "sem nome". */
  albumName: string;
  photoCount: number;
  pageCount: number;
  lang: Lang;
}

function albumTitle(albumName: string, lang: Lang): string {
  const trimmed = albumName.trim();
  if (trimmed) return `“${trimmed}”`;
  return lang === 'pt' ? 'um álbum' : 'an album';
}

/** Texto sem a URL — alguns destinos recebem link em campo separado. */
export function buildShareText({ albumName, photoCount, pageCount, lang }: ShareFacts): string {
  const title = albumTitle(albumName, lang);

  if (lang === 'pt') {
    const photos = `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}`;
    const pages = `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`;
    return `Acabei de montar ${title} no Memento: ${photos} em ${pages}, na ordem em que aconteceu. Sem IA, sem upload — roda no navegador.`;
  }

  const photos = `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`;
  const pages = `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
  return `Just built ${title} on Memento: ${photos} across ${pages}, in the order it happened. No AI, no upload — it runs in the browser.`;
}

/** Texto com a URL no fim, para destinos que só aceitam um campo de texto. */
export function buildShareTextWithUrl(facts: ShareFacts): string {
  return `${buildShareText(facts)}\n\n${SITE_URL}`;
}

/** Assunto do e-mail. */
export function buildShareSubject({ albumName, lang }: ShareFacts): string {
  const title = albumTitle(albumName, lang);
  return lang === 'pt' ? `Meu álbum ${title} — Memento` : `My album ${title} — Memento`;
}

/** Nome do arquivo do cartão, derivado do nome do álbum. */
export function shareCardFileName(albumName: string): string {
  const slug =
    albumName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      // Remove os acentos que a decomposição separou. Sem isto, "férias" viraria
      // "fe-rias" — o acento é um caractere próprio depois do NFD.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'album';
  return `memento-${slug}.jpg`;
}
