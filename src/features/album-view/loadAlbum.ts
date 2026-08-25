import 'server-only';

import {
  PHOTOS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  isSupabaseConfigured,
} from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AlbumPhotoRow, AlbumRow } from '@/lib/supabase/types';
import type { Photo } from '@/types/photo';

import {
  parseComposition,
  type AlbumComposition,
} from '@/features/album-save/composition';

/**
 * Ler um álbum do banco e devolvê-lo no formato que o livro já sabe desenhar.
 *
 * O truque da Fase 2 inteira está aqui: nada em `album-book/` sabe de onde as
 * fotos vêm. Ele recebe `Photo[]` com `previewUrl` — que na Fase 1 é um object
 * URL do arquivo local e aqui é uma URL assinada do Storage. Mesma interface,
 * origem diferente; por isso o livro, a paginação e o tema foram reaproveitados
 * sem uma linha alterada.
 *
 * Quem pode ler o quê **não** é decidido neste arquivo: é a RLS. Álbum privado
 * de outra pessoa simplesmente não volta na consulta.
 */

export interface LoadedAlbum {
  id: string;
  title: string;
  authorName: string;
  isPublic: boolean;
  isOwner: boolean;
  /**
   * Token do convite (Fase 3 · A2), ou `null` — inclusive quando ele existe e
   * quem pede não é o dono. O convite é um segredo do dono: devolvê-lo a um
   * visitante do link público transformaria a página de leitura numa porta de
   * escrita para qualquer um.
   */
  inviteToken: string | null;
  createdAt: string;
  composition: AlbumComposition;
  photos: Photo[];
}

/** O bucket é privado: cada foto precisa da própria URL assinada. */
async function signPhotos(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: AlbumPhotoRow[],
): Promise<Photo[]> {
  if (rows.length === 0) return [];

  // Uma chamada para o lote inteiro. Assinar uma a uma seria uma ida à rede
  // por foto — num álbum de 40, o tempo de resposta da página dobraria.
  const { data } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map(
    (data ?? []).map((item) => [item.path ?? '', item.signedUrl]),
  );

  return rows.flatMap((row) => {
    const url = urlByPath.get(row.storage_path);
    // Foto sem URL é foto que sumiu do bucket: melhor faltar uma página do que
    // derrubar o álbum inteiro.
    if (!url) return [];

    const takenAt = row.taken_at ? new Date(row.taken_at) : null;
    return [
      {
        id: row.id,
        file: null,
        fileName: row.file_name,
        extension: 'jpg',
        sizeInBytes: 0,
        previewUrl: url,
        exif: {
          takenAt,
          // GPS não é guardado: o que sobe é a imagem redesenhada, sem EXIF, e
          // a coordenada de uma viagem não precisa virar linha de banco para o
          // álbum funcionar.
          gps: null,
          cameraMake: null,
          cameraModel: null,
          width: row.width,
          height: row.height,
        },
        timestamp: takenAt ?? new Date(row.created_at),
        timestampSource: row.timestamp_source,
        included: true,
      } satisfies Photo,
    ];
  });
}

/** `null` quando o álbum não existe ou não pode ser lido por quem pede. */
export async function loadAlbum(albumId: string): Promise<LoadedAlbum | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();

  const { data: album } = await supabase
    .from('albums')
    .select(
      'id, user_id, title, author_name, status, is_public, invite_token, composition, created_at',
    )
    .eq('id', albumId)
    .maybeSingle<
      Pick<
        AlbumRow,
        | 'id'
        | 'user_id'
        | 'title'
        | 'author_name'
        | 'status'
        | 'is_public'
        | 'invite_token'
        | 'composition'
        | 'created_at'
      >
    >();

  if (!album || album.status !== 'ready') return null;

  const { data: rows } = await supabase
    .from('album_photos')
    .select('*')
    .eq('album_id', albumId)
    .order('position', { ascending: true })
    .returns<AlbumPhotoRow[]>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === album.user_id;

  return {
    id: album.id,
    title: album.title,
    authorName: album.author_name,
    isPublic: album.is_public,
    isOwner,
    inviteToken: isOwner ? album.invite_token : null,
    createdAt: album.created_at,
    composition: parseComposition(album.composition),
    photos: await signPhotos(supabase, rows ?? []),
  };
}

export interface AlbumListItem {
  id: string;
  title: string;
  isPublic: boolean;
  photoCount: number;
  createdAt: string;
}

/**
 * Álbuns do usuário da requisição.
 *
 * O `eq('user_id', …)` **não** é redundante com a RLS, e essa é a pegadinha:
 * políticas de `select` são permissivas e se somam com **ou**. A tabela tem
 * duas — "dono lê" e "público lê" — então, sem este filtro, a consulta traz
 * também todo álbum público de qualquer pessoa, e a lista "Meus álbuns" passa
 * a mostrar álbuns de estranhos com os botões de apagar e de link público ao
 * lado (que a RLS depois recusa, sem explicar por quê).
 *
 * A regra geral do projeto continua valendo: a RLS é quem *autoriza*. Aqui o
 * filtro está *selecionando* — são coisas diferentes, e a segunda é do app.
 */
export async function listMyAlbums(): Promise<AlbumListItem[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('albums')
    .select('id, title, is_public, photo_count, created_at')
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .returns<
      Pick<AlbumRow, 'id' | 'title' | 'is_public' | 'photo_count' | 'created_at'>[]
    >();

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    isPublic: row.is_public,
    photoCount: row.photo_count,
    createdAt: row.created_at,
  }));
}
