import { AccountShell } from '@/features/account/AccountShell';
import { ContributionInbox } from '@/features/album-contrib/ContributionInbox';
import { InviteControls } from '@/features/album-contrib/InviteControls';
import type { Inbox } from '@/features/album-contrib/loadContributions';
import { CollaboratorList } from '@/features/album-edit/CollaboratorList';
import { FinishControls } from '@/features/album-edit/FinishControls';
import type { Collaborator } from '@/features/album-edit/loadCollaborators';

import { AlbumHeader } from './AlbumHeader';
import { AlbumViewer } from './AlbumViewer';
import type { LoadedAlbum } from './loadAlbum';
import { ShareControls } from './ShareControls';

/**
 * A página de um álbum guardado, já com os dados na mão — quem carrega é a
 * rota (`app/album/[id]/page.tsx`). Separada dela para a página poder ser
 * desenhada sem banco (dados de exemplo) e para a rota ficar só com a decisão
 * de quem vê o quê.
 *
 * Veste a roupa da `/album` e de "Meus álbuns" (`AccountShell`, sem as abas):
 * topo com a marca, "← Meus álbuns", título grande e centrado, ações em pílula
 * logo abaixo. O álbum vem logo depois do título — o objeto é o produto — e,
 * para o dono, depois dele: o que chegou pelo convite e um painel só com link
 * público, convite, quem monta junto e dar por pronto.
 */
export function AlbumPageView({
  album,
  inbox,
  collaborators,
}: {
  album: Omit<LoadedAlbum, 'stored'>;
  inbox: Inbox;
  collaborators: Collaborator[];
}) {
  /** Quem monta este álbum: o dono ou um convidado a montar. */
  const isMember = album.isOwner || album.isEditor;

  return (
    // Sem as abas da conta: aqui se está **vendo um álbum**, numa página dele,
    // e não numa terceira tela da conta. A volta é o "← Meus álbuns" do alto.
    <AccountShell section={null}>
      <section className="af-section ac-section av-section">
        <AlbumHeader
          albumId={album.id}
          title={album.title}
          authorName={album.authorName}
          createdAt={album.createdAt}
          lockedAt={album.lockedAt}
          photos={album.photos}
          composition={album.composition}
          canEdit={album.canEdit}
          canDownload={isMember}
          showMakeYours={!isMember}
          showBack={isMember}
        />

        {album.photos.length > 0 ? (
          // `top`: as visões num trilho deitado acima do álbum, e não numa
          // coluna ao lado — a coluna empurrava o livro para fora do centro.
          <div className="af-viewer af-viewer-bare av-viewer">
            <AlbumViewer
              title={album.title}
              photos={album.photos}
              composition={album.composition}
              layout="top"
            />
          </div>
        ) : (
          <p className="ac-empty ac-empty-text">Este álbum está vazio.</p>
        )}

        {album.isOwner && (
          <div className="av-owner">
            {/* O que chegou pelo convite vem primeiro: é a única coisa desta
                parte que espera uma decisão sua. */}
            <ContributionInbox
              pending={inbox.pending}
              contributorCount={inbox.contributorCount}
            />

            <section className="ac-card av-panel" aria-labelledby="av-panel-title">
              <header className="av-panel-head">
                <h2 id="av-panel-title" className="ac-card-title">
                  Compartilhar e montar junto
                </h2>
              </header>
              <ShareControls albumId={album.id} isPublic={album.isPublic} variant="row" />
              <div className="av-group">
                <InviteControls
                  albumId={album.id}
                  token={album.inviteToken}
                  role={album.inviteRole}
                  locked={album.lockedAt !== null}
                />
                <CollaboratorList albumId={album.id} collaborators={collaborators} />
              </div>
              {/* Dar por pronto por último: é o gesto que encerra os outros. */}
              <FinishControls
                albumId={album.id}
                lockedAt={album.lockedAt}
                photoCount={album.photos.length}
              />
            </section>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
