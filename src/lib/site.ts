/**
 * Onde o Memento mora na internet.
 *
 * Usado pelos textos de compartilhamento (X, WhatsApp, e-mail): eles precisam
 * de uma URL absoluta, e ela não pode sair de `window.location` — o texto é
 * montado antes de existir uma página pública do álbum, e localhost não serve
 * de convite para ninguém.
 *
 * Trocar de domínio é trocar esta linha.
 */
export const SITE_URL = 'https://memento.vercel.app';

/** Como a URL aparece escrita no meio de uma frase. */
export const SITE_LABEL = 'memento.vercel.app';
