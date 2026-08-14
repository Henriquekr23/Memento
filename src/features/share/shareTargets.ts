/**
 * Para onde o texto vai. Cada destino é uma URL de intenção — o navegador abre
 * o app ou o site, e quem escreve a mensagem final é sempre a pessoa.
 *
 * Nada aqui fala com API de rede social: são links `https://` comuns, sem
 * script de terceiro, sem pixel de rastreamento e sem tocar na CSP (`connect-src
 * 'self'` continua intacto, porque nenhuma requisição sai da página).
 */

import type { Lang } from '@/features/i18n/lang';
import { SITE_URL } from '@/lib/site';

import {
  buildShareSubject,
  buildShareText,
  buildShareTextWithUrl,
  type ShareFacts,
} from './shareMessage';

export type ShareTargetId = 'x' | 'whatsapp' | 'telegram' | 'email';

export interface ShareTarget {
  id: ShareTargetId;
  label: string;
  href: string;
}

const LABELS: Record<ShareTargetId, string> = {
  x: 'X',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'E-mail',
};

/**
 * Monta os quatro links a partir dos mesmos fatos do álbum.
 *
 * O X recebe texto e URL em campos separados (ele conta os caracteres do link
 * de forma própria); WhatsApp e Telegram levam o texto com a URL embutida.
 */
export function buildShareTargets(facts: ShareFacts): ShareTarget[] {
  const text = buildShareText(facts);
  const textWithUrl = buildShareTextWithUrl(facts);

  return [
    {
      id: 'x',
      label: LABELS.x,
      href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`,
    },
    {
      id: 'whatsapp',
      label: LABELS.whatsapp,
      href: `https://wa.me/?text=${encodeURIComponent(textWithUrl)}`,
    },
    {
      id: 'telegram',
      label: LABELS.telegram,
      href: `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`,
    },
    {
      id: 'email',
      label: LABELS.email,
      href: `mailto:?subject=${encodeURIComponent(buildShareSubject(facts))}&body=${encodeURIComponent(textWithUrl)}`,
    },
  ];
}

/** Rótulo do botão nativo de compartilhar, quando o aparelho tem um. */
export function nativeShareLabel(lang: Lang): string {
  return lang === 'pt' ? 'Compartilhar o cartão' : 'Share the card';
}

/**
 * Compartilhamento nativo do sistema (folha do Android/iOS), com o cartão como
 * arquivo quando o aparelho aceita imagens.
 *
 * Devolve `false` quando não há API disponível ou quando a pessoa cancela — daí
 * o chamador continua mostrando os links, que funcionam em qualquer lugar.
 */
export async function shareNatively(
  facts: ShareFacts,
  card: Blob | null,
  fileName: string,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false;

  const payload: ShareData = {
    title: 'Memento',
    text: buildShareText(facts),
    url: SITE_URL,
  };

  if (card) {
    const file = new File([card], fileName, { type: card.type });
    // `canShare` é o único jeito de saber se o aparelho aceita arquivo: no
    // desktop e em navegadores antigos ele nem existe, e chamar `share` com
    // `files` lança um erro em vez de cair para o texto.
    if (navigator.canShare?.({ files: [file] })) {
      payload.files = [file];
    }
  }

  try {
    await navigator.share(payload);
    return true;
  } catch {
    // Cancelar o compartilhamento rejeita a promessa com AbortError. Não é erro
    // que interesse a ninguém: é a pessoa mudando de ideia.
    return false;
  }
}
