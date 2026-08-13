import Link from 'next/link';

/**
 * A marca: um print antigo — moldura, área de imagem e a faixa branca embaixo,
 * onde se escrevia a legenda à mão — com um M no lugar da fotografia.
 *
 * Desenhada em `currentColor` de propósito: o mesmo arquivo serve o cabeçalho
 * claro, o escuro e o hover em acento, sem uma variante por tema. O mesmo
 * traçado está em `app/icon.svg` (favicon), lá sim com cores fixas, porque a
 * aba do navegador não herda nada da página.
 */
export function LogoMark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* o print */}
      <rect
        x="3.25"
        y="4.25"
        width="25.5"
        height="23.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* a área de imagem */}
      <rect x="6.5" y="7.5" width="19" height="13" fill="currentColor" opacity="0.1" />
      {/* o M */}
      <path
        d="M10 18.5V10l6 5.2 6-5.2v8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* serifas */}
      <path
        d="M8 18.5h4M20 18.5h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* a legenda escrita à mão na faixa de baixo */}
      <path
        d="M9 24h9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/**
 * Marca + nome, sempre clicável para o início. É o único caminho de volta na
 * tela do álbum — daí o `aria-label`, já que visualmente só se lê "Memento".
 */
export function Wordmark({ tagline }: { tagline?: string }) {
  return (
    <Link href="/" aria-label="Memento — voltar ao início" className="wordmark">
      <LogoMark className="wordmark-glyph" />
      <span className="flex items-baseline gap-3.5">
        <span className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.01em]">
          Memento
        </span>
        {tagline && (
          <span className="hidden text-xs uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-text)_55%,transparent)] sm:inline">
            {tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
