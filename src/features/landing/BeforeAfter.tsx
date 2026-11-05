'use client';

import { useRef, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';

import { useLang } from '@/features/i18n/LangProvider';

import { COPY } from './copy';
import { TripImage } from './LandingCta';
import { filmStamp, samplePhoto, SAMPLE_TRIP, shortDayLabel } from './sampleTrip';

/**
 * Os ladrilhos da galeria do celular, de cima para baixo: as fotos da viagem
 * misturadas com o que toda galeria tem — print de conversa (`chat`), foto
 * repetida, foto tremida (`blur`) e documento (`doc`). Tudo do mesmo tamanho:
 * a falta de hierarquia é o argumento da seção.
 */
type Tile = { kind: 'photo' | 'blur'; photo: number } | { kind: 'chat' | 'doc' };
const P = (photo: number): Tile => ({ kind: 'photo', photo });
const B = (photo: number): Tile => ({ kind: 'blur', photo });
const CHAT: Tile = { kind: 'chat' };
const DOC: Tile = { kind: 'doc' };
const TILES: Tile[] = [
  P(0), CHAT, P(1), P(1), B(2), P(3),
  P(4), P(5), DOC, P(6), P(6), CHAT,
  B(7), P(8), P(9), P(9), CHAT, P(10),
  P(11), DOC, P(2), B(5), P(7), P(4),
  CHAT, P(3), P(8), P(11), B(10), P(0),
  P(5), P(9), CHAT, P(2), DOC, P(6),
];

/** O álbum do lado "depois": a mesma viagem, com uma foto grande e as datas. */
const HERO = samplePhoto('torres-del-paine');
const SIDE = ['laguna-amanhecer', 'glaciar-grey'].map(samplePhoto);

/**
 * "Antes e depois": texto à esquerda e, à direita, uma comparação que se
 * arrasta — a galeria do celular de um lado, o álbum do outro, separados por
 * uma alça. É o mesmo argumento dos dois cartões de antes, só que a pessoa
 * vê a passagem acontecer em vez de ler sobre ela.
 *
 * A divisória é uma variável CSS (`--split`) escrita direto no quadro, fora
 * do React — arrastar não re-renderiza nada. O ponteiro arrasta em qualquer
 * ponto do quadro; o teclado usa o `<input type="range">` por baixo, que é
 * também o que o leitor de tela anuncia. As duas telas são ilustração
 * (`aria-hidden`): o que elas mostram já está escrito na coluna da esquerda.
 */
export function BeforeAfter() {
  const { lang } = useLang();
  const copy = COPY[lang];
  const t = copy.beforeAfter;
  const frameRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  const setSplit = (percent: number) => {
    const value = Math.min(100, Math.max(0, percent));
    frameRef.current?.style.setProperty('--split', `${value.toFixed(2)}%`);
    if (rangeRef.current) rangeRef.current.value = String(Math.round(value));
  };

  const fromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSplit(((event.clientX - rect.left) / rect.width) * 100);
  };

  return (
    <section
      id="antes-e-depois"
      data-lp-section="antes-e-depois"
      aria-labelledby="lp-ba-title"
      className="page-shell lp-ba"
    >
      <div className="lp-ba-copy">
        <h2 id="lp-ba-title" className="lp-h lp-ba-title">
          {t.title}
        </h2>
        <p className="lp-ba-lead">{t.lead}</p>
        <div className="lp-ba-points">
          {[t.before, t.after].map((panel, i) => (
            <div key={panel.badge} className="lp-ba-point">
              <span className="lp-mono lp-ba-tag" data-tone={i === 0 ? 'before' : 'after'}>
                {panel.badge}
              </span>
              <div>
                <h3 className="lp-h lp-ba-point-title">{panel.title}</h3>
                <p className="lp-ba-point-body">{panel.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <figure className="lp-ba-figure">
        <div
          ref={frameRef}
          className="lp-ba-frame"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            fromPointer(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event);
          }}
        >
          {/* Antes: a galeria do celular. */}
          <div aria-hidden className="lp-ba-layer lp-ba-gallery">
            <div className="lp-ba-appbar">
              <div>
                <p className="lp-ba-apptitle">{t.galleryTitle}</p>
                <p className="lp-mono lp-ba-appcount">{t.galleryCount}</p>
              </div>
              <span className="lp-ba-appbtn">{t.gallerySelect}</span>
            </div>
            <div className="lp-ba-grid">
              {TILES.map((tile, i) =>
                tile.kind === 'photo' || tile.kind === 'blur' ? (
                  <div key={i} className="lp-ba-tile" data-kind={tile.kind}>
                    <TripImage src={SAMPLE_TRIP[tile.photo].src} sizes="120px" />
                  </div>
                ) : (
                  <div key={i} className="lp-ba-tile" data-kind={tile.kind}>
                    <span />
                    <span />
                    <span />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Depois: o álbum, na capa de tecido azul do herói. */}
          <div aria-hidden className="lp-ba-layer lp-ba-album">
            <div className="lp-ba-spread">
              <div className="lp-ba-page">
                <p className="lp-mono lp-ba-page-kicker">
                  {shortDayLabel(HERO.timestamp, copy.weekdays)} · {HERO.place}
                </p>
                <p className="lp-ba-page-title">{copy.hero.albumTitle}</p>
                <div className="lp-ba-photo lp-ba-photo-big">
                  <TripImage src={HERO.src} sizes="(max-width: 1023px) 45vw, 300px" />
                  <span className="lp-stamp lp-ba-stamp">{filmStamp(HERO.timestamp, true)}</span>
                </div>
              </div>
              <div className="lp-ba-page lp-ba-page-right">
                {SIDE.map((photo) => (
                  <div key={photo.id} className="lp-ba-side">
                    <div className="lp-ba-photo">
                      <TripImage src={photo.src} sizes="(max-width: 1023px) 40vw, 260px" />
                      <span className="lp-stamp lp-ba-stamp">{filmStamp(photo.timestamp)}</span>
                    </div>
                    <p className="lp-mono lp-ba-caption">
                      {shortDayLabel(photo.timestamp, copy.weekdays)} · {photo.place}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <span aria-hidden className="lp-mono lp-ba-badge" data-side="before">
            {t.before.badge}
          </span>
          <span aria-hidden className="lp-mono lp-ba-badge" data-side="after">
            {t.after.badge}
          </span>

          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            aria-label={t.compareLabel}
            className="lp-ba-range"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSplit(Number(event.target.value))}
          />
          <div aria-hidden className="lp-ba-handle">
            <span className="lp-ba-knob">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </div>
        <figcaption className="lp-mono lp-ba-hint">{t.dragHint}</figcaption>
      </figure>
    </section>
  );
}
