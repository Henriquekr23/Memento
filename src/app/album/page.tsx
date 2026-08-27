'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { buildShareCard } from '@/features/share/shareCard';
import { saveThankYouHandoff } from '@/features/thank-you/handoff';
import { AlbumEditor } from '@/features/album-editor/AlbumEditor';
import { IconCloud, IconTrash } from '@/features/album-editor/icons';
import { EditorStart } from '@/features/album-editor/EditorStart';
import { useAlbumSave } from '@/features/album-save/useAlbumSave';
import { InlineAuthDialog } from '@/features/auth/InlineAuthDialog';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { useLang } from '@/features/i18n/LangProvider';
import type { EditorAlbum } from '@/types/album-editor';

export default function AlbumPage() {
  const router = useRouter();
  const { lang } = useLang();
  const album = useAlbum();
  const { exportAlbum, isExporting, progress, error } = useAlbumExport();
  const cloud = useAlbumSave();

  /**
   * A composição corrente, espelhada aqui.
   *
   * O estado mora dentro do editor; esta cópia existe porque salvar na nuvem e
   * exportar são ações da *página* (elas navegam, mexem em rota e em sessão) e
   * precisam do álbum inteiro no momento do clique.
   */
  const [composition, setComposition] = useState<EditorAlbum | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const hasPhotos = album.photos.length > 0;

  const { addFiles } = album;
  const handleStart = useCallback(
    async (files: File[]) => {
      await addFiles(files, 'album');
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
   * Um cartão que falha não cancela nada: a página de agradecimento funciona
   * sem ele, e o arquivo do álbum já está no disco da pessoa a essa altura.
   */
  const handleExport = useCallback(
    async (current: EditorAlbum) => {
      const succeeded = await exportAlbum({
        name: album.name,
        photos: album.photos,
        album: current,
      });

      if (!succeeded) return;

      const cardDataUrl = await buildShareCard({
        albumName: album.name,
        photoCount: album.photos.length,
        pageCount: current.pages.length,
        previewUrls: album.photos.slice(0, 3).map((photo) => photo.previewUrl),
        lang,
      }).catch(() => null);

      saveThankYouHandoff({
        albumName: album.name,
        photoCount: album.photos.length,
        pageCount: current.pages.length,
        cardDataUrl,
      });

      router.push('/obrigado');
    },
    [album.name, album.photos, exportAlbum, lang, router],
  );

  return (
    // Com o editor aberto a régua da página abre: uma bancada de 1054 px no
    // meio de uma tela de 1440 é o que empurrava a barra e o inspetor para
    // fora. A marca, a linha e o rodapé acompanham — continua uma régua só.
    <main className={`page-shell page-body${hasPhotos ? ' is-wide' : ''}`}>
      <SiteNav variant="inner" tagline="Guarde a memória" />
      <hr className={`hr ${hasPhotos ? '' : 'mb-6'}`} />

      {/* Entrar sem sair da página: navegar destruiria o álbum, que só existe
          na memória desta aba. Ver `InlineAuthDialog`. */}
      <InlineAuthDialog
        open={cloud.needsAuth}
        onClose={cloud.cancelAuth}
        onSignedIn={cloud.resume}
      />

      <ConfirmDialog
        open={isClearConfirmOpen}
        title="Descartar este álbum?"
        description={`As ${album.photos.length} foto(s) importadas, a composição das páginas e os textos escritos serão perdidos. Os arquivos no seu computador continuam intactos.`}
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          album.clear();
          setComposition(null);
          setIsClearConfirmOpen(false);
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      <div className="space-y-6">
        {!hasPhotos && (
          <EditorStart
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

        {cloud.progress && (
          <p className="text-sm text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Guardando na nuvem… {cloud.progress.processed}/{cloud.progress.total}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {cloud.error && <p className="text-sm text-red-400">{cloud.error}</p>}

        {hasPhotos && (
          // O editor ocupa a tela inteira abaixo da barra: é uma bancada, não um
          // bloco de conteúdo no meio da página.
          <div className="h-[calc(100dvh-140px)] min-h-[560px] overflow-hidden rounded-[16px] border border-[var(--color-divider)]">
            <AlbumEditor
              photos={album.photos}
              name={album.name}
              onName={album.setName}
              onUpload={(files) => album.addFiles(files, 'tray')}
              onChange={setComposition}
              onExport={handleExport}
              actions={
                <>
                  {isSupabaseConfigured && composition && (
                    <button
                      type="button"
                      className="ae-btn"
                      aria-label="Salvar na nuvem"
                      title="Salvar na nuvem"
                      disabled={cloud.isSaving}
                      onClick={() =>
                        cloud.save({
                          title: album.name,
                          photos: album.photos,
                          album: composition,
                        })
                      }
                    >
                      <IconCloud size={13} />
                      <span className="ae-btn-text">
                        {cloud.isSaving ? 'Guardando…' : 'Salvar na nuvem'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="ae-btn"
                    aria-label="Descartar"
                    title="Descartar"
                    onClick={() => setIsClearConfirmOpen(true)}
                  >
                    <IconTrash size={13} />
                    <span className="ae-btn-text">Descartar</span>
                  </button>
                </>
              }
            />
          </div>
        )}
      </div>

      <SiteFooter />
      {/* A bolha de ajuda é fixa no canto inferior direito — exatamente onde
          fica o inspetor com o editor aberto. Some enquanto a bancada está em
          uso; na tela de partida ela continua ali. */}
      {!hasPhotos && <FaqWidget />}
    </main>
  );
}
