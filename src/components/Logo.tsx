import Link from 'next/link';

/**
 * A marca: duas fotos empilhadas fora de esquadro, uma atrás da outra.
 *
 * É o gesto de quem espalha um monte de fotos na mesa antes de colar no álbum
 * — o produto inteiro em dois retângulos. A de trás é vazada (só o contorno),
 * a da frente é sólida: a pilha tem uma foto escolhida em cima, que é
 * exatamente o que a ferramenta faz.
 *
 * Feita em `currentColor` de propósito: o mesmo arquivo serve o cabeçalho
 * claro, o escuro e a barra transparente sobre a foto do herói, sem uma
 * variante por tema. O mesmo desenho está em `app/icon.svg` (favicon), lá com
 * cores fixas — a aba do navegador não herda nada da página.
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
      {/* a foto de baixo, inclinada para a esquerda */}
      <rect
        x="4.5"
        y="8.5"
        width="14"
        height="18"
        rx="3"
        transform="rotate(11 11.5 17.5)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.45"
      />
      {/* a de cima, cheia — é a que foi escolhida */}
      <rect
        x="11"
        y="4.5"
        width="14"
        height="18"
        rx="3"
        transform="rotate(-10 18 13.5)"
        fill="currentColor"
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
        <span className="font-[family-name:var(--font-heading)] text-[19px] font-extrabold tracking-[-0.02em]">
          Memento
        </span>
        {tagline && (
          <span className="hidden text-xs uppercase tracking-[0.08em] opacity-60 sm:inline">
            {tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
