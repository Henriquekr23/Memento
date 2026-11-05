'use client';

import { useMemo, useRef } from 'react';

import { isDated } from '@/features/album-builder/selection';
import { useLang } from '@/features/i18n/LangProvider';
import { groupPhotosByDay, sortPhotosChronologically } from '@/lib/sortPhotos';
import type { Photo } from '@/types/photo';

import { FLOW_COPY } from './copy';
import { IconChevronLeft, IconChevronRight } from '@/features/album-editor/icons';

/** Quanto cada seta anda. */
const STEP_PX = 520;

interface TimelineGroup {
  key: string;
  long: string;
  short: string;
  photos: Photo[];
}

/** Nome da foto para o leitor de tela: o arquivo, sem a extensão. */
export function photoName(photo: Pick<Photo, 'fileName'>): string {
  const dot = photo.fileName.lastIndexOf('.');
  return dot > 0 ? photo.fileName.slice(0, dot) : photo.fileName;
}

/**
 * A viagem inteira numa faixa só, na ordem em que foi vivida.
 *
 * Mostra **todas** as fotos importadas, inclusive as que a pessoa tirou do
 * álbum (cinza, ponto vazio) — tocar numa foto tira ou devolve. A ordem aqui é
 * sempre a do relógio, independente da ordem das páginas: é o mapa, não a
 * montagem. Dias saem de `groupPhotosByDay`, o mesmo agrupamento da landing;
 * foto sem data no EXIF vai para "Sem data", no fim.
 */
export function Timeline({
  photos,
  excluded,
  insideCount,
  onToggle,
}: {
  photos: readonly Photo[];
  excluded: ReadonlySet<string>;
  insideCount: number;
  onToggle: (id: string) => void;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const stripRef = useRef<HTMLDivElement>(null);

  const formatters = useMemo(
    () => ({
      long: new Intl.DateTimeFormat(t.locale, { weekday: 'long', day: 'numeric', month: 'long' }),
      weekday: new Intl.DateTimeFormat(t.locale, { weekday: 'short' }),
      time: new Intl.DateTimeFormat(t.locale, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    }),
    [t.locale],
  );

  const groups = useMemo<TimelineGroup[]>(() => {
    const dated = sortPhotosChronologically(photos.filter(isDated));
    const undated = sortPhotosChronologically(photos.filter((photo) => !isDated(photo)));
    const days: TimelineGroup[] = groupPhotosByDay(dated).map((day) => ({
      key: day.key,
      long: formatters.long.format(day.date),
      short: `${formatters.weekday.format(day.date).replace('.', '')} ${day.date.getDate()}`,
      photos: day.photos,
    }));
    if (undated.length > 0) {
      days.push({ key: 'sem-data', long: t.noDate, short: t.noDate, photos: undated });
    }
    return days;
  }, [photos, formatters, t.noDate]);

  const scroll = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollBy({ left: direction * STEP_PX, behavior: reduce ? 'instant' : 'smooth' });
  };

  return (
    <div className="af-timeline">
      <div className="af-timeline-head">
        <div className="af-timeline-title">
          <h2 className="lp-h af-h2">{t.timeline}</h2>
          <span className="af-mono af-muted">{t.inAlbum(insideCount, photos.length)}</span>
        </div>
        <div className="af-timeline-arrows">
          <button
            type="button"
            className="af-icon-btn"
            aria-label={t.timelinePrev}
            onClick={() => scroll(-1)}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="af-icon-btn"
            aria-label={t.timelineNext}
            onClick={() => scroll(1)}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={stripRef} className="af-tl-strip">
        <div className="af-tl-track">
          <span aria-hidden className="af-tl-line" />
          {groups.map((group) => (
            <div key={group.key} className="af-tl-day">
              <div className="af-tl-day-head">
                <span className="af-tl-day-label">
                  <span className="af-tl-long">{group.long}</span>
                  <span className="af-tl-short">{group.short}</span>
                </span>
                <span className="af-mono af-muted af-tl-count">{t.dayCount(group.photos.length)}</span>
              </div>
              <div className="af-tl-photos">
                {group.photos.map((photo) => {
                  const inside = !excluded.has(photo.id);
                  const time = isDated(photo) ? formatters.time.format(photo.timestamp) : t.noTime;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className="af-tl-item"
                      data-in={inside}
                      aria-pressed={inside}
                      aria-label={t.photoAria(photoName(photo), time, inside)}
                      onClick={() => onToggle(photo.id)}
                    >
                      <span className="af-tl-frame">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.previewUrl} alt="" draggable={false} loading="lazy" />
                      </span>
                      <span aria-hidden className="af-tl-stem" />
                      <span aria-hidden className="af-tl-dot" />
                      <span aria-hidden className="af-mono af-muted af-tl-time">
                        {time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="af-help af-timeline-help">{t.timelineHelp}</p>
    </div>
  );
}
