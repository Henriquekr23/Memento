'use client';

import { Tooltip } from '@/components/Tooltip';
import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

/**
 * Alterna o tema lendo o estado atual do próprio documento.
 *
 * Sem estado no React de propósito: o padrão vem do sistema operacional por
 * media query no CSS, e ler isso durante o render quebraria a hidratação.
 * Aqui a única fonte da verdade é o `data-theme` no <html>.
 */
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
}

function SunIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="theme-icon-sun"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="theme-icon-moon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { lang } = useLang();
  const t = COMMON[lang];

  return (
    <Tooltip label={t.themeTip} side="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t.themeAria}
        className="btn btn-secondary btn-icon"
      >
        <SunIcon />
        <MoonIcon />
      </button>
    </Tooltip>
  );
}
