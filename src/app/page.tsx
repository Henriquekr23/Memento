'use client';

import { useCallback, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AlbumBook } from '@/features/album-book/AlbumBook';
import { useAlbumBook } from '@/features/album-book/useAlbumBook';
import { AlbumGrid } from '@/features/album-builder/AlbumGrid';
import { AlbumToolbar, type AlbumView } from '@/features/album-builder/AlbumToolbar';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';

export default function HomePage() {
  const album = useAlbum();
  const book = useAlbumBook(album.includedPhotos);
  const { exportAlbum, isExporting, progress, error, exporterLabel } =
    useAlbumExport();
  const [view, setView] = useState<AlbumView>('grid');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const hasPhotos = album.photos.length > 0;
  const isBookView = view === 'book' && hasPhotos;

  // Depois de importar, o lugar interessante é o álbum — não a grade.
  const { addFiles } = album;
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      await addFiles(files);
      setView('book');
    },
    [addFiles],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-20">
      <header className="flex flex-col items-start gap-1 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Memento
        </h1>
        <p className="text-sm text-amber-300/90">Keep the Journey</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          Suba as fotos da viagem, deixe que a data de cada uma coloque tudo em
          ordem e monte o álbum página por página. Tudo acontece no seu navegador
          — nenhuma foto é enviada para lugar nenhum.
        </p>
      </header>

      {hasPhotos && (
        <AlbumToolbar
          name={album.name}
          onNameChange={album.setName}
          view={view}
          onViewChange={setView}
          totalCount={album.photos.length}
          includedCount={album.includedPhotos.length}
          withoutExifDateCount={album.withoutExifDateCount}
          sortDirection={album.sortDirection}
          isManuallyOrdered={album.isManuallyOrdered}
          isExporting={isExporting}
          exportLabel={exporterLabel}
          onSortByDate={album.sortByDate}
          onExport={() =>
            exportAlbum({
              name: album.name,
              photos: album.includedPhotos,
              photoCaptions: book.photoCaptions,
              stories: book.stories,
            })
          }
          onClear={() => setIsClearConfirmOpen(true)}
        />
      )}

      <ConfirmDialog
        open={isClearConfirmOpen}
        title="Descartar este álbum?"
        description={`As ${album.photos.length} foto(s) importadas, a ordem das páginas e os textos escritos serão perdidos. Os arquivos no seu computador continuam intactos.`}
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          album.clear();
          setIsClearConfirmOpen(false);
          setView('grid');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      <div className="space-y-6">
        {/* A área grande de arrastar só faz sentido no começo. Depois disso o
            "+ Fotos" do depósito dá conta, e a tela respira. */}
        {!hasPhotos && (
          <PhotoDropzone
            onFilesSelected={handleFilesSelected}
            disabled={album.status.isImporting}
          />
        )}

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

        {album.status.oversizedFileNames.length > 0 && (
          <p className="text-sm text-amber-300/80">
            {album.status.oversizedFileNames.length} arquivo(s) ignorado(s) por
            passarem de 80 MB — grandes demais para abrir no navegador.
          </p>
        )}

        {isExporting && progress && (
          <p className="text-sm text-white/60">
            Montando o álbum… {progress.processed}/{progress.total}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!hasPhotos && (
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
              <span className="text-amber-300">3.</span> Folheie o álbum, ajuste
              as páginas e baixe em ZIP.
            </li>
          </ol>
        )}

        {hasPhotos &&
          (isBookView ? (
            <AlbumBook
              book={book}
              albumName={album.name}
              photos={album.includedPhotos}
              trayPhotos={album.trayPhotos}
              isImporting={album.status.isImporting}
              onSwapPhotos={album.swapPhotos}
              onPlaceAfter={album.placeAfter}
              onSendToTray={album.sendToTray}
              onReorderPhotos={album.reorderIncluded}
              onAddFiles={handleFilesSelected}
            />
          ) : (
            <AlbumGrid
              photos={album.photos}
              onReorder={album.movePhoto}
              onRemove={album.removePhoto}
              onToggleIncluded={album.toggleIncluded}
            />
          ))}
      </div>
    </main>
  );
}
