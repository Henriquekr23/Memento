'use server';

import { revalidatePath } from 'next/cache';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { nameOf } from '@/features/auth/name';

import { parseComposition, type AlbumComposition } from './composition';

/**
 * Escrita de álbuns. Tudo que grava metadado passa por aqui — o navegador só
 * fala direto com o Storage, para os bytes das fotos.
 *
 * Por que dois passos (`createAlbumDraft` antes, `finalizeAlbum` depois): o
 * caminho de cada foto no Storage contém o id do álbum, então o álbum precisa
 * existir antes do primeiro upload. Enquanto os uploads acontecem, o álbum
 * fica em `draft` e não aparece em lugar nenhum; se o navegador fechar no meio,
 * o que sobra é um rascunho invisível, não um álbum quebrado.
 */

export interface SavePhotoInput {
  id: string;
  position: number;
  storagePath: string;
  fileName: string;
  width: number;
  height: number;
  /** ISO 8601, ou `null` quando a foto não tem data alguma. */
  takenAt: string | null;
  timestampSource: 'exif' | 'file';
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const NOT_SIGNED_IN = 'Entre na sua conta para guardar o álbum.';

/**
 * Teto de fotos por álbum.
 *
 * Não é limite de produto — é limite de requisição. A lista de fotos vem do
 * navegador, e uma chamada forjada com dezenas de milhares de itens viraria um
 * `insert` gigante contra o banco do free tier. Nenhum álbum de verdade chega
 * perto disso; um pedido que chega, chega errado.
 */
const MAX_PHOTOS_PER_ALBUM = 500;

/** Título vazio não ajuda ninguém a se achar na lista. */
function cleanTitle(title: string): string {
  const trimmed = title.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : 'Álbum sem nome';
}

/** Inteiro não-negativo, ou `null`. Número vindo do cliente pode ser qualquer coisa. */
function safeInt(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= max ? rounded : null;
}

/** Data em ISO, ou `null`. */
function safeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export async function createAlbumDraft(
  title: string,
): Promise<ActionResult<{ albumId: string; userId: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const { data, error } = await supabase
    .from('albums')
    .insert({ user_id: user.id, title: cleanTitle(title), status: 'draft' })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: 'Não foi possível criar o álbum. Tente de novo.' };
  }
  return { ok: true, data: { albumId: data.id as string, userId: user.id } };
}

export async function finalizeAlbum(input: {
  albumId: string;
  title: string;
  composition: AlbumComposition;
  photos: SavePhotoInput[];
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (input.photos.length === 0) {
    return { ok: false, error: 'O álbum precisa de pelo menos uma foto.' };
  }
  if (input.photos.length > MAX_PHOTOS_PER_ALBUM) {
    return {
      ok: false,
      error: `Um álbum guardado na nuvem cabe até ${MAX_PHOTOS_PER_ALBUM} fotos.`,
    };
  }

  // A lista inteira vem do navegador — inclusive o caminho de cada arquivo no
  // Storage. A RLS impede ler o que é de outra pessoa, mas nada além desta
  // conferência impediria gravar uma linha apontando para fora da pasta deste
  // álbum. Prefixo errado, pedido recusado inteiro.
  const prefix = `${user.id}/${input.albumId}/`;
  const rows = [];
  for (const photo of input.photos) {
    if (typeof photo.id !== 'string' || photo.id.length < 8 || photo.id.length > 64) {
      return { ok: false, error: 'O índice do álbum veio inválido. Tente de novo.' };
    }
    if (!photo.storagePath.startsWith(prefix)) {
      return { ok: false, error: 'O índice do álbum veio inválido. Tente de novo.' };
    }
    rows.push({
      id: photo.id,
      album_id: input.albumId,
      position: safeInt(photo.position, MAX_PHOTOS_PER_ALBUM) ?? 0,
      storage_path: photo.storagePath,
      file_name: String(photo.fileName ?? '').slice(0, 255),
      width: safeInt(photo.width, 100000),
      height: safeInt(photo.height, 100000),
      taken_at: safeIso(photo.takenAt),
      timestamp_source: photo.timestampSource === 'exif' ? 'exif' : 'file',
    });
  }

  // Salvar de novo o mesmo rascunho não deve duplicar as linhas.
  await supabase.from('album_photos').delete().eq('album_id', input.albumId);

  const { error: photosError } = await supabase.from('album_photos').insert(rows);
  if (photosError) {
    // O texto do Postgres fica no log do servidor e não vai para a tela: nome
    // de política, de coluna e de restrição descrevem o esquema para quem
    // estiver sondando, e não ajudam em nada quem só quer salvar o álbum.
    console.error('[album-save] falha ao gravar as fotos', photosError);
    return {
      ok: false,
      error: 'As fotos subiram, mas o índice do álbum falhou. Tente salvar de novo.',
    };
  }

  const { error } = await supabase
    .from('albums')
    .update({
      title: cleanTitle(input.title),
      // Copiado agora, e não lido depois: a página pública não pode consultar
      // `auth.users`, e o nome de quem compartilhou faz parte do álbum.
      author_name: nameOf(user),
      // Passa pelo parser antes de gravar: o que entra no banco tem o formato
      // que o app sabe ler de volta, mesmo que a chamada venha adulterada.
      composition: parseComposition(input.composition),
      photo_count: input.photos.length,
      status: 'ready',
    })
    .eq('id', input.albumId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[album-save] falha ao concluir o álbum', error);
    return { ok: false, error: 'Não foi possível concluir o álbum. Tente de novo.' };
  }

  revalidatePath('/albums');
  revalidatePath(`/album/${input.albumId}`);
  return { ok: true, data: null };
}

export async function setAlbumVisibility(
  albumId: string,
  isPublic: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const { error } = await supabase
    .from('albums')
    .update({ is_public: isPublic })
    .eq('id', albumId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: 'Não foi possível mudar o link público.' };

  revalidatePath('/albums');
  revalidatePath(`/album/${albumId}`);
  return { ok: true, data: null };
}

export async function deleteAlbum(albumId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  // Os arquivos primeiro: apagar a linha antes deixaria os objetos órfãos
  // ocupando o 1 GB do free tier para sempre, sem nada apontando para eles.
  //
  // Em páginas, porque `list` devolve no máximo 100 por chamada por padrão —
  // sem o laço, um álbum de 120 fotos deixava 20 arquivos para trás a cada
  // exclusão, invisíveis e impossíveis de achar depois.
  //
  // Sempre relendo do começo: o que foi apagado some da listagem, então o
  // offset não avança. O teto de rodadas existe para o caso de o `remove`
  // falhar em silêncio — melhor deixar arquivo para trás do que girar sem fim.
  //
  // Duas pastas, não uma: desde a A2 o que chega por convite mora em
  // `{usuário}/{álbum}/contrib/`, e `list` não é recursivo — varrer só a raiz
  // deixaria a caixa de entrada inteira ocupando o bucket para sempre, sem
  // álbum nenhum apontando para ela.
  const PAGE = 100;
  const MAX_ROUNDS = Math.ceil(MAX_PHOTOS_PER_ALBUM / PAGE) + 1;
  const prefixes = [`${user.id}/${albumId}`, `${user.id}/${albumId}/contrib`];

  for (const prefix of prefixes) {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const { data: files } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .list(prefix, { limit: PAGE });

      // `list` devolve a subpasta `contrib` como uma entrada sem `id`. Removê-la
      // pelo nome não faz nada (não é objeto) e faria o laço girar até o teto
      // achando que ainda há trabalho.
      const objects = (files ?? []).filter((file) => file.id !== null);
      if (objects.length === 0) break;

      const { error: removeError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove(objects.map((file) => `${prefix}/${file.name}`));

      if (removeError) {
        console.error('[album-save] falha ao apagar as fotos do storage', removeError);
        break;
      }
    }
  }

  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: 'Não foi possível apagar o álbum.' };

  revalidatePath('/albums');
  return { ok: true, data: null };
}
