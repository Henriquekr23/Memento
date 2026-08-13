'use client';

import type { SortDirection } from '@/lib/sortPhotos';

export type AlbumView = 'grid' | 'book';

interface AlbumToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  view: AlbumView;
  onViewChange: (view: AlbumView) => void;
  totalCount: number;
  includedCount: number;
  withoutExifDateCount: number;
  sortDirection: SortDirection;
  isManuallyOrdered: boolean;
  isExporting: boolean;
  exportLabel: string;
  onSortByDate: (direction: SortDirection) => void;
  onExport: () => void;
  onClear: () => void;
}

/** Quatro quadradinhos: a grade de contato, folha de miniaturas. */
function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden className="opacity-80">
      <rect x="0.75" y="0.75" width="5" height="5" fill="currentColor" />
      <rect x="8.25" y="0.75" width="5" height="5" fill="currentColor" />
      <rect x="0.75" y="8.25" width="5" height="5" fill="currentColor" />
      <rect x="8.25" y="8.25" width="5" height="5" fill="currentColor" />
    </svg>
  );
}

/** Duas páginas abertas com o vinco no meio: o livro. */
function BookIcon() {
  return (
    <svg
      width="15"
      height="13"
      viewBox="0 0 16 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden
      className="opacity-80"
    >
      <path d="M8 3.2v9.4M8 3.2C6.6 2 4.8 1.4 1.6 1.4v9.4c3.2 0 5 .6 6.4 1.8M8 3.2c1.4-1.2 3.2-1.8 6.4-1.8v9.4c-3.2 0-5 .6-6.4 1.8" />
    </svg>
  );
}

const VIEWS: { id: AlbumView; label: string; icon: React.ReactNode }[] = [
  { id: 'grid', label: 'Grade', icon: <GridIcon /> },
  { id: 'book', label: 'Álbum', icon: <BookIcon /> },
];

export function AlbumToolbar({
  name,
  onNameChange,
  view,
  onViewChange,
  totalCount,
  includedCount,
  withoutExifDateCount,
  sortDirection,
  isManuallyOrdered,
  isExporting,
  exportLabel,
  onSortByDate,
  onExport,
  onClear,
}: AlbumToolbarProps) {
  return (
    <div className="sticky top-0 z-20 -mx-[clamp(20px,5vw,72px)] mb-6 border-b border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] px-[clamp(20px,5vw,72px)] py-4 backdrop-blur">
      {/* Uma linha só: o nome à esquerda ocupa o que sobrar, e à direita fica
          o que existe nos dois modos. Com os botões da Grade nesta linha, o par
          Grade/Álbum trocava de lugar a cada alternância — e o alvo do clique
          fugia do cursor. Por isso eles moram na linha de baixo. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <input
          id="album-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Dê um nome a este álbum"
          aria-label="Nome do álbum"
          className="title-input min-w-[200px] flex-1"
        />

        <div className="flex items-center gap-2.5">
          <div className="switch" role="group" aria-label="Como ver as fotos">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onViewChange(option.id)}
                aria-pressed={view === option.id}
                className="switch-opt"
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={isExporting || includedCount === 0}
            className="btn btn-primary"
          >
            {isExporting ? 'Gerando…' : exportLabel}
          </button>
        </div>
      </div>

      {/* Contagem e curadoria são assunto da Grade. No Álbum a barra fica só
          com o título e os dois controles — a contagem passa a viver no canto
          do depósito, perto das fotos de que ela fala. */}
      {view === 'grid' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[color-mix(in_srgb,var(--color-text)_45%,transparent)]">
            <span>
              <span className="tabular-nums text-[color-mix(in_srgb,var(--color-text)_75%,transparent)]">
                {includedCount}
              </span>{' '}
              de <span className="tabular-nums">{totalCount}</span>{' '}
              {totalCount === 1 ? 'foto' : 'fotos'} no álbum
            </span>
            {isManuallyOrdered && (
              <>
                <span aria-hidden>·</span>
                <span className="text-[var(--color-accent-700)]">ordem manual</span>
              </>
            )}
            {withoutExifDateCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span title="Essas fotos usam a data do arquivo, que pode não ser a data real">
                  {withoutExifDateCount} sem data no EXIF
                </span>
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onSortByDate(sortDirection === 'asc' ? 'desc' : 'asc')
              }
              title="Reordenar tudo por data e hora"
              className="btn btn-secondary btn-sm"
            >
              {sortDirection === 'asc' ? '↑ Mais antigas' : '↓ Mais recentes'}
            </button>

            <button
              type="button"
              onClick={onClear}
              className="btn btn-secondary btn-sm"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
