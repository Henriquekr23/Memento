import 'server-only';

import {
  PHOTOS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  isSupabaseConfigured,
} from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AlbumEditorRow,
  AlbumInviteRole,
  AlbumPhotoRow,
  AlbumRow,
} from '@/lib/supabase/types';
import type { Photo } from '@/types/photo';

import {
  parseComposition,
  type AlbumComposition,
} from '@/features/album-save/composition';
import type { StoredPhoto } from '@/features/album-edit/plan';

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
   * Dono do álbum. É o primeiro pedaço do caminho de toda foto no Storage, e
   * um colaborador precisa dele para saber onde gravar o que acrescentar.
   */
  ownerId: string;
  /** Convidado a editar e já dentro (Fase 3 · A3). Nunca é o dono. */
  isEditor: boolean;
  /**
   * Se a bancada abre agora: dono ou colaborador, **e** álbum ainda não
   * finalizado. Quem decide de verdade é a RLS (`can_edit_album`); isto aqui é
   * o que a tela usa para não oferecer um botão que o banco vai recusar.
   */
  canEdit: boolean;
  /** Quando o álbum foi dado por pronto, ou `null` enquanto está em montagem. */
  lockedAt: string | null;
  /**
   * Token do convite (Fase 3 · A2), ou `null` — inclusive quando ele existe e
   * quem pede não é o dono. O convite é um segredo do dono: devolvê-lo a um
   * visitante do link público transformaria a página de leitura numa porta de
   * escrita para qualquer um.
   */
  inviteToken: string | null;
  /** Papel do convite corrente — `null` pelo mesmo motivo do token acima. */
  inviteRole: AlbumInviteRole | null;
  createdAt: string;
  composition: AlbumComposition;
  photos: Photo[];
  /**
   * Onde cada foto está guardada, na ordem das páginas. Só quem edita usa
   * isto: é o que diz o que já subiu (e portanto não precisa subir de novo) e
   * o que apagar do bucket quando a foto sai do álbum.
   */
  stored: StoredPhoto[];
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
      'id, user_id, title, author_name, status, is_public, invite_token, invite_role, locked_at, composition, created_at',
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
        | 'invite_role'
        | 'locked_at'
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

  // Uma consulta a mais só quando ela pode mudar a resposta: para o dono, e
  // para quem nem sequer entrou na conta, a lista de colaboradores não decide
  // nada. A RLS já deixa cada um ler apenas a própria linha aqui.
  let isEditor = false;
  if (user && !isOwner) {
    const { data: membership } = await supabase
      .from('album_editors')
      .select('user_id')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle<Pick<AlbumEditorRow, 'user_id'>>();
    isEditor = membership !== null;
  }

  return {
    id: album.id,
    title: album.title,
    authorName: album.author_name,
    isPublic: album.is_public,
    isOwner,
    ownerId: album.user_id,
    isEditor,
    canEdit: (isOwner || isEditor) && album.locked_at === null,
    lockedAt: album.locked_at,
    inviteToken: isOwner ? album.invite_token : null,
    inviteRole: isOwner ? album.invite_role : null,
    createdAt: album.created_at,
    composition: parseComposition(album.composition),
    photos: await signPhotos(supabase, rows ?? []),
    stored: (rows ?? []).map((row) => ({
      id: row.id,
      storagePath: row.storage_path,
    })),
  };
}

export interface AlbumListItem {
  id: string;
  title: string;
  isPublic: boolean;
  photoCount: number;
  createdAt: string;
  /** Finalizado: aparece com a marca e sem o botão de editar. */
  lockedAt: string | null;
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
    .select('id, title, is_public, photo_count, created_at, locked_at')
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .returns<
      Pick<
        AlbumRow,
        'id' | 'title' | 'is_public' | 'photo_count' | 'created_at' | 'locked_at'
      >[]
    >();

  return (data ?? []).map(toListItem);
}

function toListItem(
  row: Pick<
    AlbumRow,
    'id' | 'title' | 'is_public' | 'photo_count' | 'created_at' | 'locked_at'
  >,
): AlbumListItem {
  return {
    id: row.id,
    title: row.title,
    isPublic: row.is_public,
    photoCount: row.photo_count,
    createdAt: row.created_at,
    lockedAt: row.locked_at,
  };
}

/**
 * Álbuns de outras pessoas em que este usuário foi convidado a editar.
 *
 * Consulta em dois passos, e não um `join`: a política "albums: colaborador lê"
 * já devolve essas linhas, mas uma consulta em `albums` sem `where` traria
 * junto todo álbum público do mundo — pela mesma soma de políticas com **ou**
 * que obriga o `eq('user_id', …)` de `listMyAlbums`. Os ids saem de
 * `album_editors`, onde a RLS já restringe à própria pessoa, e o `in` que
 * segue é o filtro que falta.
 */
export async function listAlbumsIEdit(): Promise<AlbumListItem[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from('album_editors')
    .select('album_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .returns<Pick<AlbumEditorRow, 'album_id'>[]>();

  const ids = (memberships ?? []).map((row) => row.album_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('albums')
    .select('id, title, is_public, photo_count, created_at, locked_at')
    .in('id', ids)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .returns<
      Pick<
        AlbumRow,
        'id' | 'title' | 'is_public' | 'photo_count' | 'created_at' | 'locked_at'
      >[]
    >();

  return (data ?? []).map(toListItem);
}
