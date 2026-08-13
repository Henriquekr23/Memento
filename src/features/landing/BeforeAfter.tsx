'use client';

import Link from 'next/link';

import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { COPY } from './copy';

/**
 * "Antes e depois": à esquerda a galeria do celular, à direita o álbum.
 *
 * As duas ilustrações são SVG desenhado à mão, não captura de tela: não pesam
 * no carregamento, seguem o tema claro/escuro pelas variáveis de cor e não
 * envelhecem quando a interface muda.
 *
 * O argumento está na forma, antes do texto: à esquerda tudo é do mesmo
 * tamanho, alinhado na grade, sem hierarquia — mil fotos e nenhuma história.
 * À direita há uma foto grande, uma pequena, um espaço em branco e uma legenda:
 * alguém escolheu.
 */

/** A grade do aplicativo de fotos: retângulos iguais, todos do mesmo peso. */
function PhoneMock() {
  const cols = [12, 73, 134];
  const rows = [52, 113, 174, 235];
  /** Quais quadradinhos ficam mais escuros — só para a grade não parecer lisa. */
  const shades = [0.1, 0.06, 0.14, 0.07, 0.12, 0.05, 0.09, 0.13, 0.06, 0.11, 0.08, 0.12];

  return (
    <svg viewBox="0 0 200 300" className="block h-auto w-full" aria-hidden>
      <rect
        x="0.75"
        y="0.75"
        width="198.5"
        height="298.5"
        rx="18"
        fill="var(--color-surface)"
        stroke="var(--color-divider)"
        strokeWidth="1.5"
      />
      {/* barra de status e título da galeria */}
      <rect x="78" y="12" width="44" height="5" rx="2.5" fill="var(--color-divider)" />
      <rect x="12" y="30" width="62" height="8" rx="4" fill="var(--color-divider)" />

      {rows.map((y, rowIndex) =>
        cols.map((x, colIndex) => {
          const shade = shades[(rowIndex * 3 + colIndex) % shades.length];
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="54"
              height="54"
              rx="2"
              fill={`color-mix(in srgb, var(--color-text) ${shade * 100}%, var(--color-bg))`}
            />
          );
        }),
      )}

      {/* a grade continua para fora da tela: é sempre "mais um pouco" */}
      <rect x="12" y="289" width="176" height="4" rx="2" fill="var(--color-divider)" />
    </svg>
  );
}

/** O álbum: duas páginas, uma foto que manda na página e uma legenda escrita. */
function AlbumMock() {
  return (
    <svg viewBox="0 0 200 300" className="block h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="mm-ba-spine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="color-mix(in srgb, var(--color-text) 14%, transparent)" />
          <stop offset="0.5" stopColor="transparent" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--color-text) 14%, transparent)" />
        </linearGradient>
      </defs>

      {/* as duas folhas abertas */}
      <g transform="translate(6 34)">
        <rect
          x="0"
          y="0"
          width="188"
          height="232"
          rx="3"
          fill="var(--color-bg)"
          stroke="var(--color-divider)"
          strokeWidth="1.5"
        />
        <rect x="88" y="1" width="12" height="230" fill="url(#mm-ba-spine)" />
        <line
          x1="94"
          y1="2"
          x2="94"
          y2="230"
          stroke="var(--color-divider)"
          strokeWidth="1"
        />

        {/* página esquerda: a foto grande, levemente torta, com moldura */}
        <g transform="rotate(-1.6 47 96)">
          <rect
            x="14"
            y="24"
            width="66"
            height="80"
            fill="var(--color-surface)"
            stroke="var(--color-divider)"
            strokeWidth="1"
          />
          <rect
            x="19"
            y="29"
            width="56"
            height="56"
            fill="color-mix(in srgb, var(--color-accent) 26%, var(--color-surface))"
          />
          <line
            x1="19"
            y1="95"
            x2="57"
            y2="95"
            stroke="var(--color-divider)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        {/* a legenda que só o dono da memória sabe escrever */}
        <line x1="14" y1="126" x2="76" y2="126" stroke="var(--color-divider)" strokeWidth="2" />
        <line x1="14" y1="134" x2="62" y2="134" stroke="var(--color-divider)" strokeWidth="2" />
        {/* espaço em branco de propósito: a página respira */}

        {/* página direita: a data, duas fotos menores e o resto vazio */}
        <line
          x1="108"
          y1="26"
          x2="140"
          y2="26"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="rotate(1.4 137 70)">
          <rect
            x="108"
            y="40"
            width="58"
            height="52"
            fill="var(--color-surface)"
            stroke="var(--color-divider)"
            strokeWidth="1"
          />
          <rect
            x="112"
            y="44"
            width="50"
            height="36"
            fill="color-mix(in srgb, var(--color-text) 12%, var(--color-surface))"
          />
        </g>
        <g transform="rotate(-1 137 130)">
          <rect
            x="108"
            y="104"
            width="58"
            height="52"
            fill="var(--color-surface)"
            stroke="var(--color-divider)"
            strokeWidth="1"
          />
          <rect
            x="112"
            y="108"
            width="50"
            height="36"
            fill="color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))"
          />
        </g>
        <line x1="108" y1="176" x2="158" y2="176" stroke="var(--color-divider)" strokeWidth="2" />
      </g>

      {/* o marcador, como na marca: a viagem continua */}
      <path
        d="M150 28h9v46l-4.5-6-4.5 6z"
        fill="var(--color-accent)"
        opacity="0.9"
      />
    </svg>
  );
}

export function BeforeAfter() {
  const { lang } = useLang();
  const t = COPY[lang];
  const c = COMMON[lang];

  const panels = [
    { key: 'before', ...t.beforeAfter.before, mock: <PhoneMock /> },
    { key: 'after', ...t.beforeAfter.after, mock: <AlbumMock /> },
  ];

  return (
    <section id="antes-depois" className="py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="kicker">{t.beforeAfter.kicker}</span>
        <span className="text-[13px] text-[color-mix(in_srgb,var(--color-text)_50%,transparent)]">
          {t.beforeAfter.hint}
        </span>
      </div>

      <h2 className="mt-4 max-w-[26ch] text-[clamp(26px,3.4vw,34px)] font-normal leading-[1.16]">
        {t.beforeAfter.title}
      </h2>

      {/* Empilha no celular e vira duas colunas a partir de md. A seta no meio
          é `aria-hidden` e só existe no desktop: empilhado, a ordem de leitura
          já diz qual é o antes e qual é o depois. */}
      <div className="mt-9 grid items-start gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        {panels.map((panel, index) => (
          <div key={panel.key} className="contents">
            <div className="ba-panel" data-tone={panel.key}>
              <span className="ba-badge">{panel.badge}</span>
              <div className="mx-auto mt-5 w-full max-w-[260px]">{panel.mock}</div>
              <h3 className="mt-6 text-[21px] font-normal leading-7">{panel.title}</h3>
              <p className="mt-2 text-[15px] leading-[25px] text-[color-mix(in_srgb,var(--color-text)_76%,transparent)]">
                {panel.body}
              </p>
            </div>

            {index === 0 && (
              <div
                aria-hidden
                className="hidden self-center font-[family-name:var(--font-heading)] text-[28px] text-[var(--color-accent)] md:block"
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Link href="/album" className="btn btn-primary" aria-label={c.ctaAria}>
          {c.cta}
        </Link>
        <span className="text-[13px] text-[color-mix(in_srgb,var(--color-text)_55%,transparent)]">
          {t.beforeAfter.ctaNote}
        </span>
      </div>
    </section>
  );
}
