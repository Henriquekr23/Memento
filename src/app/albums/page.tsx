import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountShell } from '@/features/account/AccountShell';
import { AlbumsEmpty, AlbumsHead, SharedAlbumsHead } from '@/features/account/AccountTexts';
import { AlbumCard } from '@/features/album-view/AlbumCard';
import { firstNameOf, nameOf } from '@/features/auth/name';
import { listAlbumsIEdit, listMyAlbums } from '@/features/album-view/loadAlbum';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Meus álbuns — Memento',
  robots: { index: false },
};

/**
 * Os álbuns guardados. Server component: a consulta sai daqui e a RLS já
 * devolve só os do dono — não existe filtro por usuário no código do app, e é
 * assim que se evita o bug clássico de esquecer o `where user_id`.
 *
 * Na roupa da /album (`AccountShell`): título grande e centrado, uma ação
 * principal logo abaixo dele, e os álbuns como cartões numa grade — cada um com
 * a capa à mão para abrir, o link público e as ações dele.
 */
export default async function AlbumsPage() {
  if (!isSupabaseConfigured) redirect('/album');

  const user = await getSessionUser();
  if (!user) redirect('/entrar?next=%2Falbums');

  const albums = await listMyAlbums();
  // Álbuns de outras pessoas em que este usuário entrou por um convite de
  // montagem. Sem esta seção, quem foi convidado dependeria de guardar o link
  // do convite para achar o álbum de novo.
  const shared = await listAlbumsIEdit();

  const firstName = firstNameOf(nameOf(user));

  return (
    <AccountShell section="albums">
      <section className="af-section ac-section">
        {/* Só uma ação aqui. "Sair" morava nesta barra, do mesmo tamanho e ao
            lado de "Montar um álbum" — a ação mais destrutiva colada na mais
            construtiva. Agora ele vive na tela de conta e no menu do topo. */}
        <AlbumsHead count={albums.length} firstName={firstName} />

        {albums.length === 0 ? (
          <AlbumsEmpty />
        ) : (
          <ul className="ac-grid">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </ul>
        )}

        {shared.length > 0 && (
          <div className="ac-block">
            <SharedAlbumsHead />
            <ul className="ac-grid">
              {shared.map((album) => (
                <AlbumCard key={album.id} album={album} variant="shared" />
              ))}
            </ul>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
