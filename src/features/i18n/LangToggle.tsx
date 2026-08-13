'use client';

import { Tooltip } from '@/components/Tooltip';

import { COMMON } from './common';
import { useLang } from './LangProvider';

/** Botão PT/EN. Mostra o idioma para onde se vai, não o atual. */
export function LangToggle() {
  const { lang, toggle } = useLang();
  const t = COMMON[lang];

  return (
    <Tooltip label={t.langTip} side="bottom">
      <button
        type="button"
        onClick={toggle}
        aria-label={t.langAria}
        className="btn btn-secondary h-9 min-w-9 px-2.5 text-xs tracking-[0.06em]"
      >
        {lang === 'pt' ? 'EN' : 'PT'}
      </button>
    </Tooltip>
  );
}
