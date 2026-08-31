import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { AlbumEditWorkbench } from '@/features/album-edit/AlbumEditWorkbench';
import { loadAlbum } from '@/features/album-view/loadAlbum';
import { getSessionUser } from '@/lib/supabase/server';

/**
 * A bancada de um álbum guardado.
 *
 * Server component só para decidir e carregar: quem pode editar, e com que
 * fotos. A decisão de verdade continua sendo da RLS — se esta página se
 * enganasse e deixasse a tela abrir, `save_album_composition` recusaria a
 * gravação do mesmo jeito. O que ela evita é oferecer um botão que o banco vai
 * negar.
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
      <main className="page-shell page-body">
        <SiteNav variant="inner" />
        <hr className="hr" />
        <section className="card mx-auto mt-10 max-w-[520px] p-6 text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl">
            Álbum finalizado
          </h1>
          <p className="muted mt-2 text-sm">
            {album.isOwner
              ? 'Você deu este álbum por pronto. Para mexer nele de novo, reabra a edição na página do álbum.'
              : 'Quem montou este álbum deu ele por pronto. Ninguém mais pode mudá-lo.'}
          </p>
          <Link href={`/album/${id}`} className="btn btn-primary btn-sm mt-5">
            Ver o álbum
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    // `is-wide` como em `/album`: a bancada tem 1054 px e a régua normal da
    // página a empurraria para fora.
    <main className="page-shell page-body is-wide">
      <SiteNav variant="inner" tagline="Guarde a memória" />
      <hr className="hr" />

      <AlbumEditWorkbench
        albumId={album.id}
        ownerId={album.ownerId}
        title={album.title}
        photos={album.photos}
        stored={album.stored}
        composition={album.composition}
        isOwner={album.isOwner}
      />

      <SiteFooter />
    </main>
  );
}
