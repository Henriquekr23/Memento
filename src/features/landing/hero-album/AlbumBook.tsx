'use client';

import { useLang } from '@/features/i18n/LangProvider';
import { sortPhotosChronologically } from '@/lib/sortPhotos';

import { COPY } from '../copy';
import { LandingCta, TripImage } from '../LandingCta';
import {
  daySpan,
  filmStamp,
  SAMPLE_TRIP,
  samplePhoto,
  shortCoordinates,
  shortDayLabel,
} from '../sampleTrip';
import type { VarStyle } from '../writeVars';

/** As fotos de cada página da direita, pelo nome do arquivo em `public/landing/`. */
const PILE = ['atacama-dunas', 'janela-aviao', 'lago-pehoe'].map(samplePhoto);
const EXIF = samplePhoto('valparaiso');
const NAMED = samplePhoto('torres-del-paine');
const MOSAIC = ['santiago', 'laguna-amanhecer', 'pacifico', 'glaciar-grey'].map(samplePhoto);
const TRIP = sortPhotosChronologically(SAMPLE_TRIP);
/** O carimbo de cada página da esquerda: o dia que aquela abertura mostra. */
const PAGE_STAMPS = [TRIP[0], EXIF, NAMED, TRIP[TRIP.length - 1]].map((p) => filmStamp(p.timestamp));

/** Tamanho real das fotos na tela, para o `sizes` do `next/image`. */
const SIZES = {
  snap: '(max-width: 767px) 150px, 210px',
  page: '(max-width: 767px) 310px, 310px',
  mosaic: '(max-width: 767px) 150px, 150px',
} as const;

/**
 * O fotolivro do herói: quatro folhas (capa + 3) sobre uma página-base.
 *
 * A frente de cada folha é uma página da direita (a ilustração); o verso é a
 * página da esquerda da abertura seguinte (o texto). O CSS vira cada folha por
 * `--fN`, escrito fora do React em `useHeroAlbumVars`; no desktop ela gira em
 * torno da lombada (`rotateY`), no celular em torno do topo, como caderno de
 * espiral (`rotateX`). É o mesmo DOM nos dois — só o CSS muda.
 *
 * A ordem no DOM é a ordem de leitura: capa (o h1), texto 1, ilustração 1,
 * texto 2… e a página-base por último. Face de costas continua no DOM e na
 * árvore de acessibilidade (`backface-visibility` só esconde o desenho), então
 * a página faz sentido inteira para leitor de tela, sem animação nenhuma.
 */
export function AlbumBook({ onEndFocus }: { onEndFocus: () => void }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const hero = t.hero;

  const fronts = [
    <div key="cover" className="lp-cover">
      <span className="lp-cover-kicker">{hero.coverKicker}</span>
      <h1 id="lp-hero-title" className="lp-h lp-cover-title">
        {hero.coverTitle}
      </h1>
      <span aria-hidden className="lp-stamp">
        {PAGE_STAMPS[0]}
      </span>
    </div>,

    <div key="pile" className="lp-pile">
      {PILE.map((photo) => (
        <div key={photo.id} className="lp-snap">
          <TripImage src={photo.src} sizes={SIZES.snap} preload />
        </div>
      ))}
      <p className="lp-mono lp-pile-names">{PILE.map((p) => p.fileName).join(', ')}…</p>
    </div>,

    <div key="exif" className="lp-page-pad lp-exif">
      <div className="lp-page-photo">
        <TripImage src={EXIF.src} sizes={SIZES.page} />
        <span aria-hidden className="lp-stamp lp-photo-stamp">
          {filmStamp(EXIF.timestamp, true)}
        </span>
      </div>
      <div className="lp-mono lp-exif-lines">
        <p>
          <span className="lp-exif-key">{hero.exifDateLabel}</span>
          {hero.exifDate}
        </p>
        <p>
          <span className="lp-exif-key">{hero.exifPlaceLabel}</span>
          {shortCoordinates(EXIF.gps, hero.compass)} · {EXIF.place}
        </p>
      </div>
    </div>,

    <div key="named" className="lp-page-pad lp-named">
      <p className="lp-named-title">{hero.albumTitle}</p>
      <div className="lp-page-photo">
        <TripImage src={NAMED.src} sizes={SIZES.page} />
        <span aria-hidden className="lp-stamp lp-photo-stamp">
          {filmStamp(NAMED.timestamp, true)}
        </span>
      </div>
      <p className="lp-mono lp-named-caption">
        {shortDayLabel(NAMED.timestamp, t.weekdays)} · {NAMED.place}
      </p>
    </div>,
  ];

  const isLast = (i: number) => i === hero.pages.length - 1;

  return (
    <div className="lp-book">
      {hero.pages.map((page, i) => (
        <div
          key={i}
          className="lp-leaf"
          style={{ '--fl': `var(--f${i}, 0)`, zIndex: `var(--z${i}, ${30 - i})` } as VarStyle}
        >
          <div className="lp-face lp-face-front">
            {fronts[i]}
            <span aria-hidden className="lp-shade" />
          </div>
          <div className="lp-face lp-face-back">
            <div className="lp-text-page">
              <span className="lp-mono lp-kicker">{page.kicker}</span>
              <div className="lp-text-body">
                <h2 className="lp-h lp-page-title">{page.title}</h2>
                <p className="lp-page-copy">{page.body}</p>
                {isLast(i) && (
                  <div className="lp-page-ctas" onFocus={onEndFocus}>
                    <LandingCta />
                    <a href="#organizar" className="lp-btn lp-btn-ghost">
                      {hero.secondaryCta}
                    </a>
                  </div>
                )}
              </div>
              <span aria-hidden className="lp-stamp">
                {PAGE_STAMPS[i]}
              </span>
            </div>
            <span aria-hidden className="lp-shade" />
          </div>
        </div>
      ))}

      {/* A página-base da direita: o álbum pronto, que só aparece quando a
          última folha vira. Por último no DOM — é a última coisa que se lê. */}
      <div className="lp-base">
        <div className="lp-mosaic">
          {MOSAIC.map((photo) => (
            <div key={photo.id} className="lp-mosaic-cell">
              <TripImage src={photo.src} sizes={SIZES.mosaic} />
              <span aria-hidden className="lp-stamp lp-mosaic-stamp">
                {filmStamp(photo.timestamp)}
              </span>
            </div>
          ))}
        </div>
        <p className="lp-mono lp-base-caption">
          {hero.mosaicCaption(TRIP.length, daySpan(TRIP))}
        </p>
      </div>
    </div>
  );
}
