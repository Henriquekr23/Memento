import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadInbox } from '@/features/album-contrib/loadContributions';
import { loadCollaborators } from '@/features/album-edit/loadCollaborators';
import { AlbumPageView } from '@/features/album-view/AlbumPageView';
import { loadAlbum } from '@/features/album-view/loadAlbum';

/**
 * O álbum salvo — a página que o link compartilhado abre.
 *
 * Server component: as fotos são assinadas no servidor e chegam prontas.
 * Nenhum passo de "carregando…" no cliente, e nenhuma chave de API circulando
 * para montar URL.
 *
 * O desenho da página mora em `AlbumPageView`.
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

  // Só o dono tem caixa de entrada — para qualquer outro visitante isto volta
  // vazio sem tocar no banco.
  const inbox = await loadInbox(album.id, album.isOwner);
  const collaborators = await loadCollaborators(album.id, album.isOwner);

  return <AlbumPageView album={album} inbox={inbox} collaborators={collaborators} />;
}
