'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Wordmark } from '@/components/Logo';
import { SiteFooter } from '@/components/SiteFooter';
import { Tooltip } from '@/components/Tooltip';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { buildShareCard } from '@/features/share/shareCard';
import { saveThankYouHandoff } from '@/features/thank-you/handoff';
import { AlbumBook } from '@/features/album-book/AlbumBook';
import { useAlbumBook } from '@/features/album-book/useAlbumBook';
import { AlbumGrid } from '@/features/album-builder/AlbumGrid';
import { AlbumStart, type StartMode } from '@/features/album-builder/AlbumStart';
import { AlbumToolbar, type AlbumView } from '@/features/album-builder/AlbumToolbar';
import { StyleDrawer } from '@/features/album-style/StyleDrawer';
import { useAlbum } from '@/features/album-builder/useAlbum';
import {
  useAlbumExport,
  type ExportKind,
} from '@/features/album-export/useAlbumExport';
import { useLang } from '@/features/i18n/LangProvider';

export default function AlbumPage() {
  const router = useRouter();
  const { lang } = useLang();
  const album = useAlbum();
  const book = useAlbumBook(album.includedPhotos);
  const { exportAlbum, running, isExporting, progress, error } = useAlbumExport();
  const [view, setView] = useState<AlbumView>('grid');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  // A gaveta de estilo vive aqui, e não dentro do AlbumBook, porque quem a abre
  // é o botão da barra — e a barra é filha desta página.
  const [isStyleOpen, setIsStyleOpen] = useState(false);

  const hasPhotos = album.photos.length > 0;
  const isBookView = view === 'book' && hasPhotos;

  // Depois de importar, o lugar interessante é o álbum — não a grade.
  const { addFiles } = album;
  const handleStart = useCallback(
    async (files: File[], mode: StartMode) => {
      await addFiles(files, mode);
      setView('book');
    },
    [addFiles],
  );

  /**
   * Baixar o álbum e, dando certo, ir para o agradecimento.
   *
   * A ordem importa: o cartão é desenhado **antes** da navegação, porque ele lê
   * as fotos por object URL — e object URL morre com o documento que o criou.
   * O que atravessa é o cartão já rasterizado, guardado em `sessionStorage`.
   *
   * Um cartão que falha não cancela nada: a página de agradecimento funciona sem
   * ele, e o arquivo do álbum já está no disco da pessoa a essa altura.
   */
  const handleExport = useCallback(
    async (kind: ExportKind) => {
      const succeeded = await exportAlbum(
        {
          name: album.name,
          photos: album.includedPhotos,
          photoCaptions: book.photoCaptions,
          stories: book.stories,
          // O PDF precisa da composição para sair igual ao que está na tela; o
          // ZIP simplesmente ignora este campo.
          book: {
            pages: book.pages,
            theme: book.theme,
            pageCaptions: book.captions,
            composeModes: book.pageComposeModes,
            adjustments: book.adjustments,
            placements: book.placements,
            autoTilt: book.autoTiltEnabled,
          },
        },
        kind,
      );

      if (!succeeded) return;

      const cardDataUrl = await buildShareCard({
        albumName: album.name,
        photoCount: album.includedPhotos.length,
        pageCount: book.pages.length,
        previewUrls: album.includedPhotos.slice(0, 3).map((photo) => photo.previewUrl),
        lang,
      }).catch(() => null);

      saveThankYouHandoff({
        albumName: album.name,
        photoCount: album.includedPhotos.length,
        pageCount: book.pages.length,
        cardDataUrl,
      });

      router.push('/obrigado');
    },
    [album.name, album.includedPhotos, book, exportAlbum, lang, router],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-[clamp(20px,5vw,72px)] pb-20">
      {/* A marca é o caminho de volta: clicar em "Memento" leva ao início, como
          em qualquer site — um botão só para isso era redundante. */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-7">
        <Tooltip label="Voltar ao início" side="bottom">
          <Wordmark tagline="Guarde a memória" />
        </Tooltip>
        <Link href="/sobre" className="nav-link text-sm">
          Sobre
        </Link>
      </header>

      {/* Sangra igual à barra: a régua da barra é de ponta a ponta (ela gruda no
          topo e o fundo precisa cobrir a largura toda), então esta tem de ser
          também — duas linhas de comprimentos diferentes saltam à vista. */}
      <hr className="hr hr-bleed mb-6" />

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
          exporting={running}
          isStyleOpen={isStyleOpen}
          onToggleStyle={() => setIsStyleOpen((open) => !open)}
          onSortByDate={album.sortByDate}
          onExport={handleExport}
          onClear={() => setIsClearConfirmOpen(true)}
        />
      )}

      <StyleDrawer
        open={isStyleOpen && isBookView}
        onOpenChange={setIsStyleOpen}
        theme={book.theme}
        onChange={book.setTheme}
        autoTiltEnabled={book.autoTiltEnabled}
        onAutoTiltChange={book.setAutoTiltEnabled}
        onResetPages={book.resetPages}
      />

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
        {/* A tela de partida só existe no começo. Depois disso, o nome fica na
            barra e o "+ Fotos" do depósito dá conta — a tela respira. */}
        {!hasPhotos && (
          <AlbumStart
            name={album.name}
            onNameChange={album.setName}
            isImporting={album.status.isImporting}
            onStart={handleStart}
          />
        )}

        {album.status.isImporting && (
          <p className="text-sm text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Lendo metadados…{' '}
            {album.status.progress
              ? `${album.status.progress.processed}/${album.status.progress.total}`
              : ''}
          </p>
        )}

        {album.status.rejectedFileNames.length > 0 && (
          <p className="text-sm text-[var(--color-accent-700)]">
            {album.status.rejectedFileNames.length} arquivo(s) ignorado(s) por não
            serem imagens suportadas.
          </p>
        )}

        {album.status.oversizedFileNames.length > 0 && (
          <p className="text-sm text-[var(--color-accent-700)]">
            {album.status.oversizedFileNames.length} arquivo(s) ignorado(s) por
            passarem de 80 MB — grandes demais para abrir no navegador.
          </p>
        )}

        {isExporting && progress && (
          <p className="text-sm text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Desenhando as páginas… {progress.processed}/{progress.total}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}


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
              onAddFiles={(files) => album.addFiles(files, 'tray')}
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

      <SiteFooter />

      <FaqWidget />
    </main>
  );
}
