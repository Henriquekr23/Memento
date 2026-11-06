import Link from 'next/link';

/**
 * A marca: "m." — a inicial do nome com o ponto final, na mesma letra da
 * palavra "memento" da barra da landing (Bricolage Grotesque, peso 800, tamanho
 * óptico 26, o `--font-landing-brand`), com o mesmo espacejamento de -0.04em.
 *
 * Vai como contorno, e não como texto: o arquivo da marca é recortado só para
 * a-z (sem o ponto) e só é baixado na página inicial, e o favicon não carrega
 * fonte nenhuma. O "m" saiu da instância opsz=26/wght=800 de
 * `bricolage-grotesque-opsz-brand.woff2` e o ponto da wght=800 de
 * `bricolage-grotesque-latin.woff2`, em unidades da fonte (1000/em), com o topo
 * do x-height em y=0.
 *
 * Feita em `currentColor` de propósito: o mesmo arquivo serve o cabeçalho
 * claro, o escuro e a barra transparente sobre a foto do herói, sem uma
 * variante por tema. O mesmo desenho está em `app/icon.svg` (favicon), lá com
 * cores fixas ("m." branco sobre preto) — a aba do navegador não herda nada da
 * página. `favicon.ico` e `apple-icon.png` saem do `icon.svg` com
 * `node scripts/buildIcons.mjs`. Mexeu no desenho aqui, regere os três.
 *
 * `size` é a largura; a altura segue a proporção do "m." (≈ metade).
 */
const MARK_W = 1078.5;
const MARK_H = 555;

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
      height={Math.round((size * MARK_H) / MARK_W * 10) / 10}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M-0 542V208.2V14H127.8L129.5 178.2H148.3Q161.2 116.7 183.7 77.5Q206.3 38.3 239.6 19.2Q272.8 0 317.5 0Q364.2 0 394.7 20.3Q425.3 40.7 442.8 79.9Q460.3 119.2 465.2 178.2H480.7Q495.2 115.2 520.9 76Q546.7 36.8 582.7 18.4Q618.7 0 661.8 0Q706.2 0 739.1 17.1Q772 34.2 794.2 67.9Q816.3 101.7 827.2 152.6Q838 203.5 838 270.3V542H676V289.3Q676 238.8 667.8 205Q659.7 171.2 642.5 154.5Q625.3 137.8 597.8 137.8Q566.8 137.8 544.4 159.3Q522 180.7 509.7 219.3Q497.5 258 497.5 309.2V542H339.5V291.2Q339.5 239 330.5 205.4Q321.5 171.8 303.8 154.8Q286.2 137.8 259.5 137.8Q228.7 137.8 206.7 158.8Q184.8 179.7 173 218.3Q161.2 257 161.2 309.2V542Z" />
      <path d="M973.5 555Q921.5 555 896 533Q870.5 511 870.5 465Q870.5 418 896 396Q921.5 374 973.5 374Q1026.5 374 1052.5 396Q1078.5 418 1078.5 465Q1078.5 555 973.5 555Z" />
    </svg>
  );
}

/**
 * Marca + nome, sempre clicável para o início. É o único caminho de volta na
 * tela do álbum — daí o `aria-label`, já que visualmente só se lê "Memento".
 *
 * O nome usa `--font-brand` (a Bricolage, fixada no `:root`), e não
 * `--font-heading`: a landing troca a fonte dos títulos pela Schibsted
 * Grotesk, e a marca não pode trocar junto.
 */
export function Wordmark({ tagline }: { tagline?: string }) {
  return (
    <Link href="/" aria-label="Memento — voltar ao início" className="wordmark">
      <LogoMark className="wordmark-glyph" />
      <span className="flex items-baseline gap-3.5">
        <span className="font-[family-name:var(--font-brand)] text-[19px] font-extrabold tracking-[-0.02em]">
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
