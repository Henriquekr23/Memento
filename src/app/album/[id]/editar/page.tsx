import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AccountShell } from '@/features/account/AccountShell';
import { AlbumFlow } from '@/features/album-flow/AlbumFlow';
import { loadAlbum } from '@/features/album-view/loadAlbum';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * Reeditar um álbum guardado — no mesmo fluxo de etapas da `/album`.
 *
 * Server component só para decidir e carregar: quem pode editar, e com que
 * fotos. A decisão de verdade continua sendo da RLS — se esta página se
 * enganasse e deixasse a tela abrir, `save_album_composition` recusaria a
 * gravação do mesmo jeito. O que ela evita é oferecer um botão que o banco vai
 * negar.
 *
 * A montagem é o `AlbumFlow` da `/album`, semeado com o álbum: abre nas
 * páginas, e nome/fotos, ordem, capa e finalizar estão a um clique nas etapas
 * do alto. A diferença está só na última etapa: "Guardar mudanças" reescreve
 * este álbum em vez de criar outro.
 */

export const metadata: Metadata = {
  title: 'Editar álbum — Memento',
  robots: { index: false, follow: false },
};

export default async function AlbumEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await loadAlbum(id);

  // Mesma resposta de `/album/[id]` para álbum inexistente, privado ou
  // apagado: a página não conta a estranhos que aquele id existe.
  if (!album) notFound();

  if (!album.isOwner && !album.isEditor) {
    const user = await getSessionUser();
    // Sem conta, o mais provável é ser o dono voltando num navegador
    // deslogado — mandar para o login com volta é mais útil que um 404.
    if (!user) redirect(`/entrar?next=/album/${id}/editar`);
    notFound();
  }

  // Álbum finalizado não abre a bancada: "enviado" é um estado do álbum, não
  // uma sugestão. Quem pode reabrir é o dono, na página do álbum.
  if (!album.canEdit) {
    return (
      <AccountShell section={null}>
        <section className="af-section ac-section">
          <div className="ac-empty">
            <span aria-hidden className="ac-empty-art">
              <span />
              <span />
              <span />
            </span>
            <h1 className="lp-h ac-empty-title">Álbum finalizado</h1>
            <p className="ac-empty-text">
              {album.isOwner
                ? 'Você deu este álbum por pronto. Para mexer nele de novo, reabra a edição na página do álbum.'
                : 'Quem montou este álbum deu ele por pronto. Ninguém mais pode mudá-lo.'}
            </p>
            <Link href={`/album/${id}`} className="af-btn af-btn-primary ac-btn ac-head-cta">
              Ver o álbum
            </Link>
          </div>
        </section>
      </AccountShell>
    );
  }

  return (
    <AlbumFlow
      edit={{
        albumId: album.id,
        ownerId: album.ownerId,
        isOwner: album.isOwner,
        title: album.title,
        photos: album.photos,
        stored: album.stored,
        composition: album.composition.album,
      }}
    />
  );
}
