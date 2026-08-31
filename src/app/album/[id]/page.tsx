import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { ContributionInbox } from '@/features/album-contrib/ContributionInbox';
import { InviteControls } from '@/features/album-contrib/InviteControls';
import { loadInbox } from '@/features/album-contrib/loadContributions';
import { CollaboratorList } from '@/features/album-edit/CollaboratorList';
import { FinishControls } from '@/features/album-edit/FinishControls';
import { loadCollaborators } from '@/features/album-edit/loadCollaborators';
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

  // Só o dono tem caixa de entrada — para qualquer outro visitante isto volta
  // vazio sem tocar no banco.
  const inbox = await loadInbox(album.id, album.isOwner);
  const collaborators = await loadCollaborators(album.id, album.isOwner);

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
            {album.lockedAt ? ' · finalizado' : ''}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {album.isOwner ? (
            <ShareControls albumId={album.id} isPublic={album.isPublic} />
          ) : !album.isEditor ? (
            <Link href="/album" className="btn btn-secondary">
              Montar o meu
            </Link>
          ) : null}

          {/* O botão só aparece para quem pode mesmo mexer: dono ou convidado
              para montar, e com o álbum ainda aberto. Quem decide é a RLS —
              isto aqui só evita oferecer o que o banco vai recusar. */}
          {album.canEdit && (
            <Link href={`/album/${album.id}/editar`} className="btn btn-primary">
              Editar o álbum
            </Link>
          )}
        </div>
      </header>

      {album.isOwner && (
        <div className="mt-6 mb-12 grid gap-4">
          <InviteControls
            albumId={album.id}
            token={album.inviteToken}
            role={album.inviteRole}
            locked={album.lockedAt !== null}
          />
          <CollaboratorList albumId={album.id} collaborators={collaborators} />
          <ContributionInbox
            pending={inbox.pending}
            contributorCount={inbox.contributorCount}
          />
        </div>
      )}

      {album.photos.length > 0 ? (
        <AlbumViewer
          title={album.title}
          photos={album.photos}
          composition={album.composition}
        />
      ) : (
        <p className="card p-6 text-sm">Este álbum está vazio.</p>
      )}

      {/* Dar por pronto vem **depois** de ver o álbum, e não antes: é a última
          coisa que se faz, e a decisão só faz sentido com a montagem à vista.
          Em cima, junto do convite, ela disputava atenção com os controles de
          quem ainda está montando. */}
      {album.isOwner && (
        <div className="mt-10">
          <FinishControls
            albumId={album.id}
            lockedAt={album.lockedAt}
            photoCount={album.photos.length}
          />
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
