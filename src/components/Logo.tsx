import Link from 'next/link';

/**
 * A marca: o álbum aberto, com uma foto colada na página da esquerda e a fita
 * do marcador descendo pela da direita.
 *
 * O produto é um livro que se folheia — e o marcador é o que diz que a viagem
 * continua, que ainda há página para virar. É o "Keep the Journey" em desenho.
 *
 * Feita em `currentColor` de propósito: o mesmo arquivo serve o cabeçalho
 * claro, o escuro e o hover em acento, sem uma variante por tema. O mesmo
 * traçado está em `app/icon.svg` (favicon), lá com cores fixas e sem os
 * detalhes finos, porque a aba do navegador não herda nada da página — e a 16px
 * o que é fino some.
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
      {/* as duas folhas abertas e o vinco no meio */}
      <path
        d="M16 10.4C13.5 8.2 9.8 7.4 4.6 7.6v14.8c5.2-.2 8.9.6 11.4 2.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 10.4c2.5-2.2 6.2-3 11.4-2.8v14.8c-5.2-.2-8.9.6-11.4 2.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 10.4v14.9" stroke="currentColor" strokeWidth="1.6" />

      {/* a foto colada na página da esquerda */}
      <rect x="7.3" y="11.6" width="6.3" height="4.9" fill="currentColor" opacity="0.22" />
      {/* a legenda escrita à mão embaixo dela */}
      <path
        d="M7.5 18.9h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* O marcador. Sai do livro em cima **e** embaixo de propósito: rente à
          borda ele virava uma terceira página e o desenho ficava ilegível. */}
      <path d="M20.6 5.2h2.9v23.1l-1.45-1.95-1.45 1.95z" fill="currentColor" />
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
