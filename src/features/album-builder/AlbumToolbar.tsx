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
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/10 bg-neutral-950/85 px-4 py-4 backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-64 flex-1">
          <label
            htmlFor="album-name"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/40"
          >
            Nome do álbum
          </label>
          <input
            id="album-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ex: Chile, julho de 2026"
            className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-lg font-medium text-white outline-none transition placeholder:text-white/25 focus:border-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-white/15 p-0.5">
            {(['grid', 'book'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                aria-pressed={view === option}
                className={[
                  'rounded-full px-4 py-1.5 text-sm transition',
                  view === option
                    ? 'bg-white/90 font-medium text-neutral-900'
                    : 'text-white/60 hover:text-white',
                ].join(' ')}
              >
                {option === 'grid' ? 'Grade' : 'Álbum'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onSortByDate(sortDirection === 'asc' ? 'desc' : 'asc')}
            title="Reordenar tudo por data e hora"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
          >
            {sortDirection === 'asc' ? '↑ Mais antigas' : '↓ Mais recentes'}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-red-400/50 hover:text-red-300"
          >
            Limpar
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={isExporting || includedCount === 0}
            className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isExporting ? 'Gerando…' : exportLabel}
          </button>
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
        <span>
          {includedCount} de {totalCount} foto(s) no álbum
        </span>
        {isManuallyOrdered && (
          <span className="text-amber-300/80">ordem manual</span>
        )}
        {withoutExifDateCount > 0 && (
          <span title="Essas fotos usam a data do arquivo, que pode não ser a data real">
            {withoutExifDateCount} sem data no EXIF
          </span>
        )}
      </p>
    </div>
  );
}
