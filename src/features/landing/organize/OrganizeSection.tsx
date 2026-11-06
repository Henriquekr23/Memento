'use client';

import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { useLang } from '@/features/i18n/LangProvider';
import { groupPhotosByDay, sortPhotosChronologically } from '@/lib/sortPhotos';

import { COPY } from '../copy';
import { LandingCta, TripImage } from '../LandingCta';
import { filmStamp, SAMPLE_TRIP, shortDayLabel } from '../sampleTrip';
import type { VarStyle } from '../writeVars';
import {
  completeDays,
  dayLabelPosition,
  GEOMETRY,
  indexByDay,
  placePhotos,
  poseTransform,
  type Placement,
} from './organizeGeometry';
import { useOrganizeVars } from './useOrganizeVars';

/**
 * A viagem de exemplo pelo mesmo caminho do álbum de verdade: ordem
 * cronológica e agrupamento por dia de `lib/sortPhotos`. O dia e a vaga de
 * cada foto saem daí — não de uma tabela escrita à mão.
 */
const DAYS = groupPhotosByDay(sortPhotosChronologically(SAMPLE_TRIP));
const ITEMS = indexByDay(DAYS);
const NONE = ITEMS.map(() => false);
const ALL = ITEMS.map(() => true);

/** As variáveis de uma foto num layout: pose do externo e caminho do interno até o álbum. */
function photoVars(p: Placement, suffix: 'd' | 'm'): Record<string, string> {
  return {
    [`--pose-${suffix}`]: poseTransform(p.outer),
    [`--ax-${suffix}`]: `${(p.toAlbum?.dx ?? 0).toFixed(2)}px`,
    [`--ay-${suffix}`]: `${(p.toAlbum?.dy ?? 0).toFixed(2)}px`,
    [`--ak-${suffix}`]: (p.toAlbum?.k ?? 0).toFixed(4),
  };
}

/**
 * "Da bagunça ao álbum": fotos bagunçadas que a pessoa organiza passando o
 * mouse (ou tocando), e que, rolando mais, entram num álbum aberto — só as
 * que ela organizou, na ordem.
 *
 * As posições dos dois layouts (desktop e celular) vão juntas para o DOM como
 * variáveis CSS, e a media query escolhe qual vale. Assim o HTML do servidor já
 * vem certo para qualquer largura, e trocar de orientação não re-renderiza.
 */
export function OrganizeSection() {
  const { lang } = useLang();
  const copy = COPY[lang];
  const t = copy.organize;
  const [placed, setPlaced] = useState<boolean[]>(NONE);
  const { setSection, setStick, setCopy, revealPhase } = useOrganizeVars();

  const count = placed.filter(Boolean).length;
  const allPlaced = count === ITEMS.length;
  const desktop = placePhotos(GEOMETRY.desktop, ITEMS, placed);
  const mobile = placePhotos(GEOMETRY.mobile, ITEMS, placed);
  const dayDone = completeDays(ITEMS, placed, DAYS.length);

  const place = (index: number) =>
    setPlaced((prev) => (prev[index] ? prev : prev.map((value, i) => value || i === index)));

  // Mouse e caneta organizam ao passar por cima; o toque organiza no clique.
  // Com o dedo, `pointerenter` também dispara no começo de uma rolagem — e
  // rolar pela seção não pode arrumar foto sem querer.
  const onHover = (index: number) => (event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') place(index);
  };

  return (
    <section
      id="organizar"
      ref={setSection}
      data-lp-section="organizar"
      aria-labelledby="lp-org-title"
      className="lp-org lp-anchor"
    >
      <div ref={setStick} className="lp-org-stick">
        {/* O palco é ilustração e brinquedo de ponteiro: o teclado e o leitor
            de tela fazem o mesmo pelo botão "Arrumar tudo" e pelo contador. */}
        <div aria-hidden className="lp-org-slot">
          <div className="lp-org-stage">
            <div className="lp-org-album">
              <div className="lp-org-page lp-org-page-left" />
              <div className="lp-org-page lp-org-page-right" />
              <span className="lp-mono lp-org-album-head lp-org-album-head-left">
                {copy.hero.albumTitle}
              </span>
              <span className="lp-mono lp-org-album-head lp-org-album-head-right">
                {t.albumMonth}
              </span>
              <span className="lp-mono lp-org-album-foot">{t.albumFoot(count)}</span>
              {count === 0 && (
                <p className="lp-org-empty">
                  <span className="lp-when-pointer">{t.emptyPointer}</span>
                  <span className="lp-when-touch">{t.emptyTouch}</span>
                </p>
              )}
            </div>

            {DAYS.map((day, index) => {
              const d = dayLabelPosition(GEOMETRY.desktop, index);
              const m = dayLabelPosition(GEOMETRY.mobile, index);
              const style = {
                '--lx-d': `${d.x}px`,
                '--ly-d': `${d.y}px`,
                '--lx-m': `${m.x}px`,
                '--ly-m': `${m.y}px`,
                '--vis': dayDone[index] ? 1 : 0,
              } as VarStyle;
              return (
                <span key={day.key} className="lp-mono lp-org-day" style={style}>
                  {shortDayLabel(day.date, copy.weekdays)}
                </span>
              );
            })}

            {ITEMS.map((item, index) => {
              const style = {
                zIndex: desktop[index].z,
                ...photoVars(desktop[index], 'd'),
                ...photoVars(mobile[index], 'm'),
              } as VarStyle;
              return (
                <div
                  key={item.photo.id}
                  className="lp-ph"
                  data-placed={placed[index]}
                  style={style}
                  onPointerEnter={onHover(index)}
                  onClick={() => place(index)}
                >
                  <div className="lp-ph-card">
                    <TripImage src={item.photo.src} sizes="(max-width: 767px) 150px, 220px" />
                    <span className="lp-stamp lp-ph-stamp">{filmStamp(item.photo.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guia de rolagem: a seção ainda tem uma parte, e ela vem rolando. */}
        <div aria-hidden className="lp-scrollhint lp-org-hint">
          <span className="lp-hint-cue">
            <span className="lp-hint-dot" />
          </span>
          <span className="lp-hint-bar">
            <span />
          </span>
        </div>

        <div ref={setCopy} className="lp-org-copy">
          <div className="lp-org-blk lp-org-blk-1" onFocus={() => revealPhase(false)}>
            <h2 id="lp-org-title" className="lp-h lp-org-title">
              {t.title}
            </h2>
            <p className="lp-org-body">
              <span className="lp-when-pointer">{t.bodyPointer}</span>
              <span className="lp-when-touch">{t.bodyTouch}</span>
            </p>
            <div className="lp-org-row">
              <p className="lp-mono lp-org-count" aria-live="polite">
                <span className="lp-org-num">{count}</span> {t.counter(ITEMS.length)}
              </p>
              <button
                type="button"
                className="lp-btn lp-btn-outline-light"
                onClick={() => setPlaced(allPlaced ? NONE : ALL)}
              >
                {allPlaced ? t.scramble : t.arrange}
              </button>
            </div>
          </div>

          <div className="lp-org-blk lp-org-blk-2" onFocus={() => revealPhase(true)}>
            <h3 className="lp-h lp-org-title">{t.albumTitle}</h3>
            <p className="lp-org-body">{t.body}</p>
            <div className="lp-org-row lp-org-row-album">
              <LandingCta tone="light" />
              <p className="lp-mono lp-org-count">
                <span className="lp-org-num">{count}</span> {t.albumCounter}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
