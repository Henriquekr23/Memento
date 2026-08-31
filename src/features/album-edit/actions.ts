'use server';

import { revalidatePath } from 'next/cache';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AlbumPhotoRow, AlbumRow } from '@/lib/supabase/types';

import type { ActionResult, SavePhotoInput } from '@/features/album-save/actions';
import { parseComposition, type AlbumComposition } from '@/features/album-save/composition';
import {
  MAX_PHOTOS_PER_ALBUM,
  cleanTitle,
  isPhotoId,
  isUuid,
  safeInt,
  safeIso,
} from '@/features/album-save/sanitize';

import { planPhotoSync } from './plan';

/**
 * Reeditar um álbum que já está na nuvem (Fase 3 · A3).
 *
 * A diferença para `finalizeAlbum` não está no formato do que se grava — é o
 * mesmo índice de fotos e a mesma composição —, está em **quem** pode gravar e
 * em **quando**:
 *
 * - quem: o dono ou alguém que entrou por um convite de edição. Nenhuma das
 *   duas coisas é decidida aqui. A gravação da linha do álbum passa por
 *   `save_album_composition`, uma função `security definer` que escreve três
 *   colunas e confere `can_edit_album` — porque uma política de update daria
 *   ao colaborador a linha inteira (`is_public`, `invite_token`, `user_id`), e
 *   RLS decide linha, não coluna;
 * - quando: só enquanto o álbum não foi finalizado. Essa conferência também
 *   está lá dentro, e não só aqui, porque este server action é evitável — com
 *   a chave publicável dá para falar direto com o PostgREST.
 *
 * O que este arquivo faz de verdade, então, é o trabalho que o banco não faz:
 * conferir o formato do que chegou e limpar do Storage as fotos que saíram do
 * álbum.
 */

const NOT_SIGNED_IN = 'Entre na sua conta para continuar.';
const GONE = 'Este álbum não está mais disponível para você.';
const LOCKED =
  'Este álbum foi finalizado. Reabra a edição para poder mudar alguma coisa.';

type AlbumHead = Pick<AlbumRow, 'id' | 'user_id' | 'status' | 'locked_at'>;

/** A cabeça do álbum, do jeito que quem edita a enxerga. */
async function albumHead(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  albumId: string,
): Promise<AlbumHead | null> {
  if (!isUuid(albumId)) return null;

  // A RLS já decide o que volta: o dono lê, o colaborador lê, e mais ninguém.
  const { data } = await supabase
    .from('albums')
    .select('id, user_id, status, locked_at')
    .eq('id', albumId)
    .maybeSingle<AlbumHead>();

  return data && data.status === 'ready' ? data : null;
}

export async function saveAlbumEdits(input: {
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

  const album = await albumHead(supabase, input.albumId);
  if (!album) return { ok: false, error: GONE };
  if (album.locked_at) return { ok: false, error: LOCKED };

  if (input.photos.length === 0) {
    return { ok: false, error: 'O álbum precisa de pelo menos uma foto.' };
  }
  if (input.photos.length > MAX_PHOTOS_PER_ALBUM) {
    return {
      ok: false,
      error: `Um álbum guardado na nuvem cabe até ${MAX_PHOTOS_PER_ALBUM} fotos.`,
    };
  }

  // O prefixo é a pasta do **dono**, não a de quem está gravando: as fotos de
  // um álbum moram todas juntas, inclusive as que um colaborador acrescentou.
  // É a mesma conferência de `finalizeAlbum`, e a política de insert de
  // `album_photos` a repete no banco.
  const prefix = `${album.user_id}/${album.id}/`;
  const rows = [];
  for (const [index, photo] of input.photos.entries()) {
    if (!isPhotoId(photo.id) || !photo.storagePath.startsWith(prefix)) {
      return { ok: false, error: 'O índice do álbum veio inválido. Tente de novo.' };
    }
    rows.push({
      id: photo.id,
      album_id: album.id,
      position: safeInt(photo.position, MAX_PHOTOS_PER_ALBUM) ?? index,
      storage_path: photo.storagePath,
      file_name: String(photo.fileName ?? '').slice(0, 255),
      width: safeInt(photo.width, 100000),
      height: safeInt(photo.height, 100000),
      taken_at: safeIso(photo.takenAt),
      timestamp_source: photo.timestampSource === 'exif' ? 'exif' : 'file',
    });
  }

  // O que está guardado hoje, lido **antes** de reescrever: é a única chance
  // de saber quais arquivos ficarão sem nada apontando para eles.
  const { data: current } = await supabase
    .from('album_photos')
    .select('id, storage_path')
    .eq('album_id', album.id)
    .returns<Pick<AlbumPhotoRow, 'id' | 'storage_path'>[]>();

  const plan = planPhotoSync(
    (current ?? []).map((row) => ({ id: row.id, storagePath: row.storage_path })),
    rows.map((row) => row.id),
  );

  // Reescrever o índice inteiro, e não remendar posição por posição: a ordem
  // das fotos é a ordem das páginas, e um `update` por linha faria N idas ao
  // banco para chegar no mesmo lugar.
  await supabase.from('album_photos').delete().eq('album_id', album.id);

  const { error: photosError } = await supabase.from('album_photos').insert(rows);
  if (photosError) {
    console.error('[album-edit] falha ao regravar o índice', photosError);
    return {
      ok: false,
      error: 'Não foi possível guardar as mudanças. Tente de novo.',
    };
  }

  const { data: saved, error } = await supabase.rpc('save_album_composition', {
    target: album.id,
    new_title: cleanTitle(input.title),
    // Passa pelo parser antes de gravar, como no primeiro salvamento: o que
    // entra no banco tem o formato que o app sabe ler de volta.
    new_composition: parseComposition(input.composition),
    new_photo_count: rows.length,
  });

  if (error || saved !== true) {
    console.error('[album-edit] falha ao gravar a composição', error);
    return { ok: false, error: 'Não foi possível guardar as mudanças.' };
  }

  // Os arquivos das fotos que saíram, por último: se esta parte falhar, o
  // álbum está certo e sobra arquivo no bucket — o contrário (arquivo apagado
  // e álbum ainda apontando para ele) seria página quebrada.
  if (plan.removed.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(plan.removed.map((photo) => photo.storagePath));
    if (removeError) {
      console.error('[album-edit] fotos saíram do álbum e ficaram no bucket', removeError);
    }
  }

  revalidatePath('/albums');
  revalidatePath(`/album/${album.id}`);
  revalidatePath(`/album/${album.id}/editar`);
  return { ok: true, data: null };
}

/**
 * "Enviar o álbum": dar o trabalho por pronto.
 *
 * Um álbum finalizado para de aceitar edição (nem o dono, nem colaborador) e
 * para de receber fotos pelo convite. É o estado em que ele foi para a
 * gráfica — mexer depois disso é mexer numa coisa que já saiu.
 *
 * Só o dono finaliza, e só o dono reabre. Reabrir existe porque a alternativa
 * — uma tranca definitiva — transformaria um clique errado em álbum perdido, e
 * a data de finalização continua ali para contar que aquele álbum já foi
 * fechado uma vez.
 */
export async function finishAlbum(albumId: string): Promise<ActionResult> {
  return setLock(albumId, true);
}

export async function reopenAlbum(albumId: string): Promise<ActionResult> {
  return setLock(albumId, false);
}

async function setLock(albumId: string, locked: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (!isUuid(albumId)) return { ok: false, error: GONE };

  // `eq('user_id', …)` além da RLS: a política de update de `albums` é do
  // dono, mas o filtro é o que faz o pedido de um colaborador virar "nenhuma
  // linha" em vez de depender só dela.
  const { error } = await supabase
    .from('albums')
    .update({ locked_at: locked ? new Date().toISOString() : null })
    .eq('id', albumId)
    .eq('user_id', user.id)
    .eq('status', 'ready');

  if (error) {
    console.error('[album-edit] falha ao mudar a tranca', error);
    return {
      ok: false,
      error: locked
        ? 'Não foi possível finalizar o álbum.'
        : 'Não foi possível reabrir o álbum.',
    };
  }

  revalidatePath('/albums');
  revalidatePath(`/album/${albumId}`);
  return { ok: true, data: null };
}

/**
 * Tirar alguém da montagem.
 *
 * Fechar o convite não faz isto: o link deixa de deixar gente nova entrar, e
 * quem já entrou continua dentro. São duas portas, e esta é a que fecha para
 * uma pessoa em particular.
 */
export async function removeCollaborator(
  albumId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (!isUuid(albumId) || !isUuid(userId)) return { ok: false, error: GONE };

  const { error } = await supabase
    .from('album_editors')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', userId);

  if (error) return { ok: false, error: 'Não foi possível tirar esta pessoa.' };

  revalidatePath(`/album/${albumId}`);
  return { ok: true, data: null };
}
