'use client';

import { AlbumGrid } from '@/features/album-builder/AlbumGrid';
import { AlbumToolbar } from '@/features/album-builder/AlbumToolbar';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';

export default function HomePage() {
  const album = useAlbum();
  const { exportAlbum, isExporting, progress, error, exporterLabel } =
    useAlbumExport();

  const hasPhotos = album.photos.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-20">
      <header className="flex flex-col items-start gap-1 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Memento
        </h1>
        <p className="text-sm text-amber-300/90">Keep the Journey</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Suba as fotos da viagem, deixe que a data de cada uma coloque tudo em
          ordem e ajuste o que quiser. Tudo acontece no seu navegador — nenhuma
          foto é enviada para lugar nenhum.
        </p>
      </header>

      {hasPhotos && (
        <AlbumToolbar
          name={album.name}
          onNameChange={album.setName}
          totalCount={album.photos.length}
          includedCount={album.includedPhotos.length}
          withoutExifDateCount={album.withoutExifDateCount}
          sortDirection={album.sortDirection}
          isManuallyOrdered={album.isManuallyOrdered}
          isExporting={isExporting}
          exportLabel={exporterLabel}
          onSortByDate={album.sortByDate}
          onExport={() =>
            exportAlbum({ name: album.name, photos: album.includedPhotos })
          }
          onClear={album.clear}
        />
      )}

      <div className="space-y-6">
        <PhotoDropzone
          onFilesSelected={album.addFiles}
          disabled={album.status.isImporting}
          compact={hasPhotos}
        />

        {album.status.isImporting && (
          <p className="text-sm text-white/60">
            Lendo metadados…{' '}
            {album.status.progress
              ? `${album.status.progress.processed}/${album.status.progress.total}`
              : ''}
          </p>
        )}

        {album.status.rejectedFileNames.length > 0 && (
          <p className="text-sm text-amber-300/80">
            {album.status.rejectedFileNames.length} arquivo(s) ignorado(s) por não
            serem imagens suportadas.
          </p>
        )}

        {isExporting && progress && (
          <p className="text-sm text-white/60">
            Montando o álbum… {progress.processed}/{progress.total}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {hasPhotos ? (
          <AlbumGrid
            photos={album.photos}
            onReorder={album.movePhoto}
            onRemove={album.removePhoto}
            onToggleIncluded={album.toggleIncluded}
          />
        ) : (
          <ol className="grid gap-3 text-sm text-white/45 sm:grid-cols-3">
            <li className="rounded-xl border border-white/10 p-4">
              <span className="text-amber-300">1.</span> Selecione as fotos da
              viagem.
            </li>
            <li className="rounded-xl border border-white/10 p-4">
              <span className="text-amber-300">2.</span> Elas entram em ordem
              cronológica pela data do EXIF.
            </li>
            <li className="rounded-xl border border-white/10 p-4">
              <span className="text-amber-300">3.</span> Ajuste, nomeie e baixe o
              álbum em ZIP.
            </li>
          </ol>
        )}
      </div>
    </main>
  );
}
