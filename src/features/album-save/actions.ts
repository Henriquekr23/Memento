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

/** Título vazio não ajuda ninguém a se achar na lista. */
function cleanTitle(title: string): string {
  const trimmed = title.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : 'Álbum sem nome';
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

  // Salvar de novo o mesmo rascunho não deve duplicar as linhas.
  await supabase.from('album_photos').delete().eq('album_id', input.albumId);

  const { error: photosError } = await supabase.from('album_photos').insert(
    input.photos.map((photo) => ({
      id: photo.id,
      album_id: input.albumId,
      position: photo.position,
      storage_path: photo.storagePath,
      file_name: photo.fileName,
      width: photo.width,
      height: photo.height,
      taken_at: photo.takenAt,
      timestamp_source: photo.timestampSource,
    })),
  );
  if (photosError) {
    // O texto do banco vai junto de propósito. Sem ele, "o índice falhou" é
    // indistinguível entre coluna de tipo errado, política de RLS faltando e
    // conexão caída — e nada disso o usuário resolve adivinhando.
    console.error('[album-save] falha ao gravar as fotos', photosError);
    return {
      ok: false,
      error: `As fotos subiram, mas o índice do álbum falhou: ${photosError.message}`,
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
    return { ok: false, error: `Não foi possível concluir o álbum: ${error.message}` };
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
  const prefix = `${user.id}/${albumId}`;
  const { data: files } = await supabase.storage.from(PHOTOS_BUCKET).list(prefix);
  if (files && files.length > 0) {
    await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(files.map((file) => `${prefix}/${file.name}`));
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
