'use client';

import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

/**
 * O idioma na barra da landing: um botão só, com um globo e o idioma atual
 * (PT ou EN), ao lado de "Entrar". Tocar troca para o outro — com dois
 * idiomas, mostrar as duas opções o tempo todo era mais ruído que ajuda.
 * `aria-label` diz para onde vai, como o `LangToggle` das outras telas.
 */
export function LangSwitch() {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={COMMON[lang].langAria}
      className="lp-navbtn lp-lang"
    >
      <svg
        aria-hidden
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </svg>
      <span aria-hidden>{lang.toUpperCase()}</span>
    </button>
  );
}
