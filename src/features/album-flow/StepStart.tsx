'use client';

import { useCallback, useRef, useState } from 'react';

import type { ImportProgress } from '@/features/photo-upload/importPhotos';
import { ACCEPTED_MIME_TYPES } from '@/features/photo-upload/importPhotos';
import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { AlbumCover } from './AlbumCover';
import { FLOW_COPY } from './copy';
import { IconArrowRight, IconUpload } from './icons';

/** As miniaturas em leque depois de importar: posição e giro de cada uma. */
const FAN = [
  { x: 10, y: 14, r: -10 },
  { x: 40, y: 4, r: -4 },
  { x: 70, y: 18, r: 3 },
  { x: 100, y: 0, r: 8 },
  { x: 130, y: 12, r: 13 },
];

/** Arrastar arquivo do sistema (e não uma foto de dentro da página). */
export function isFileDrag(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Etapa 1, "Comece pelas fotos.": o nome na capa e a área de soltar.
 *
 * Importar **não avança** a página: a pessoa pode soltar mais fotos, trocar o
 * nome, e só segue no "Continuar". O que chega aparece ali mesmo, em leque,
 * com a contagem.
 *
 * O arraste de arquivos vale na mesa inteira, não só no bloco tracejado. O
 * contador de `dragenter`/`dragleave` existe porque cada filho que o ponteiro
 * cruza dispara um par dos dois — com um booleano o destaque piscaria.
 */
export function StepStart({
  name,
  onName,
  photos,
  isImporting,
  progress,
  onFiles,
  onContinue,
  notes,
}: {
  name: string;
  onName: (name: string) => void;
  photos: readonly Photo[];
  isImporting: boolean;
  progress: ImportProgress | null;
  onFiles: (files: File[]) => void;
  onContinue: () => void;
  notes: React.ReactNode;
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const count = photos.length;
  const hasPhotos = count > 0;

  const pick = useCallback(() => inputRef.current?.click(), []);

  const status = isImporting ? (
    <div className="af-drop-progress" role="status">
      <span className="af-drop-title">{t.importing}</span>
      {progress && (
        <>
          <span aria-hidden className="af-bar">
            <span
              className="af-bar-fill"
              style={{ transform: `scaleX(${progress.total ? progress.processed / progress.total : 0})` }}
            />
          </span>
          <span className="af-mono af-muted">
            {t.importProgress(progress.processed, progress.total)}
          </span>
        </>
      )}
    </div>
  ) : null;

  return (
    <section className="af-section af-section-start">
      <div className="af-head">
        <h1 className="lp-h af-title">{t.startTitle}</h1>
        <p className="af-lead">{t.startLead}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) onFiles(Array.from(files));
          event.target.value = '';
        }}
      />

      <div
        className="af-mesa af-mesa-start"
        data-drag={dragging || undefined}
        onDragEnter={(event) => {
          if (!isFileDrag(event)) return;
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(event) => {
          if (!isFileDrag(event)) return;
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          if (isImporting) return;
          const files = Array.from(event.dataTransfer.files);
          if (files.length > 0) onFiles(files);
        }}
      >
        <div className="af-cover-stage">
          <AlbumCover name={name} onName={onName} variant="hero" />
        </div>

        {/* Mouse: bloco de soltar com o botão dentro. */}
        <div className="af-drop" data-filled={hasPhotos || undefined}>
          {status ?? (
            <>
              {(!hasPhotos || dragging) && (
                <span aria-hidden className="af-drop-icon">
                  <IconUpload />
                </span>
              )}
              {hasPhotos && !dragging ? (
                <>
                  <Fan photos={photos} />
                  <p className="af-drop-title" aria-live="polite">
                    {t.ready(count)}
                  </p>
                  <button type="button" className="af-btn af-btn-ghost" onClick={pick}>
                    {t.addMore}
                  </button>
                </>
              ) : (
                <>
                  <p className="af-drop-title" aria-live="polite">
                    {dragging ? t.dropRelease : t.dropTitle}
                  </p>
                  {!dragging && (
                    <>
                      <span className="af-drop-or">{t.dropOr}</span>
                      <button type="button" className="af-btn af-btn-primary af-btn-lg" onClick={pick}>
                        {t.pick}
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Toque: não existe arrastar arquivo, então o bloco inteiro é o botão. */}
        <button
          type="button"
          className="af-drop af-drop-touch"
          data-filled={hasPhotos || undefined}
          onClick={pick}
          disabled={isImporting}
        >
          {status ?? (
            <>
              {hasPhotos ? (
                <Fan photos={photos} small />
              ) : (
                <span aria-hidden className="af-drop-icon">
                  <IconUpload size={28} strokeWidth={1.7} />
                </span>
              )}
              <span className="af-drop-title">{hasPhotos ? t.ready(count) : t.touchTitle}</span>
              <span className={hasPhotos ? 'af-pill-ghost' : 'af-pill-solid'}>
                {hasPhotos ? t.addMore : t.pick}
              </span>
            </>
          )}
        </button>

        <div className="af-start-continue is-touch">
          <ContinueButton disabled={!hasPhotos || isImporting} onClick={onContinue} label={t.continue} />
        </div>
      </div>

      {notes}

      <div className="af-start-continue is-pointer">
        <ContinueButton disabled={!hasPhotos || isImporting} onClick={onContinue} label={t.continue} />
      </div>
    </section>
  );
}

function Fan({ photos, small = false }: { photos: readonly Photo[]; small?: boolean }) {
  return (
    <span aria-hidden className={`af-fan${small ? ' is-small' : ''}`}>
      {photos.slice(0, FAN.length).map((photo, index) => (
        <span
          key={photo.id}
          className="af-fan-photo"
          style={
            {
              '--x': `${FAN[index].x}px`,
              '--y': `${FAN[index].y}px`,
              '--r': `${FAN[index].r}deg`,
            } as React.CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL local, sem otimização do Next */}
          <img src={photo.previewUrl} alt="" draggable={false} />
        </span>
      ))}
    </span>
  );
}

export function ContinueButton({
  disabled,
  onClick,
  label,
  className = '',
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`af-btn af-btn-primary af-btn-xl ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
      <IconArrowRight />
    </button>
  );
}
