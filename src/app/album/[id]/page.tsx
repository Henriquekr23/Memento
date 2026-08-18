import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { AlbumViewer } from '@/features/album-view/AlbumViewer';
import { ShareControls } from '@/features/album-view/ShareControls';
import { loadAlbum } from '@/features/album-view/loadAlbum';

/**
 * O álbum salvo — a página que o link compartilhado abre.
 *
 * Server component: as fotos são assinadas no servidor e chegam prontas.
 * Nenhum passo de "carregando…" no cliente, e nenhuma chave de API circulando
 * para montar URL.
 */

export const metadata: Metadata = {
  // Álbum é coisa de quem tem o link, não de quem busca no Google. Um álbum de
  // viagem indexado seria uma surpresa desagradável para o dono.
  robots: { index: false, follow: false },
};

export default async function AlbumPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await loadAlbum(id);

  // Privado, inexistente ou apagado dão a mesma resposta de propósito: assim a
  // página não conta a estranhos que aquele id existe.
  if (!album) notFound();

  const created = new Date(album.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="page-shell page-body">
      <SiteNav variant="inner" />
      <hr className="hr" />

      <header className="page-head">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl">
            {album.title}
          </h1>
          <p className="muted mt-1 text-sm">
            {/* O nome de quem montou só aparece se a pessoa deu um: conta
                antiga, criada antes do campo, não vira "álbum de ". */}
            {album.authorName ? `Um álbum de ${album.authorName} · ` : ''}
            {album.photos.length}{' '}
            {album.photos.length === 1 ? 'foto' : 'fotos'} · guardado em {created}
          </p>
        </div>

        {album.isOwner ? (
          <ShareControls albumId={album.id} isPublic={album.isPublic} />
        ) : (
          <Link href="/album" className="btn btn-secondary">
            Montar o meu
          </Link>
        )}
      </header>

      {album.photos.length > 0 ? (
        <AlbumViewer
          title={album.title}
          photos={album.photos}
          composition={album.composition}
        />
      ) : (
        <p className="card p-6 text-sm">Este álbum está vazio.</p>
      )}

      <SiteFooter />
    </main>
  );
}
