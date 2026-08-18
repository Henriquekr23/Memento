import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { AlbumCard } from '@/features/album-view/AlbumCard';
import { firstNameOf, nameOf } from '@/features/auth/name';
import { listMyAlbums } from '@/features/album-view/loadAlbum';
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
 */
export default async function AlbumsPage() {
  if (!isSupabaseConfigured) redirect('/album');

  const user = await getSessionUser();
  if (!user) redirect('/entrar?next=%2Falbums');

  const albums = await listMyAlbums();

  return (
    <main className="page-shell page-body">
      <SiteNav variant="inner" />
      <hr className="hr" />

      {/* Só uma ação nesta barra. "Sair" morava aqui, do mesmo tamanho e ao
          lado de "Montar um álbum" — a ação mais destrutiva colada na mais
          construtiva. Agora ele vive na tela de conta e no menu do topo. */}
      <header className="page-head">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl">
            Álbuns de {firstNameOf(nameOf(user))}
          </h1>
          <p className="muted mt-1 text-sm">
            {albums.length === 0
              ? 'Nenhum guardado ainda'
              : `${albums.length} ${albums.length === 1 ? 'álbum guardado' : 'álbuns guardados'}`}
          </p>
        </div>

        <Link href="/album" className="btn btn-primary">
          Montar um álbum
        </Link>
      </header>

      {albums.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm">
            Nenhum álbum guardado ainda. Monte um em{' '}
            <Link href="/album" className="nav-link">
              /album
            </Link>{' '}
            e use <strong>Salvar na nuvem</strong> — daí ele aparece aqui, com
            link para compartilhar.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </ul>
      )}

      <SiteFooter />
    </main>
  );
}
