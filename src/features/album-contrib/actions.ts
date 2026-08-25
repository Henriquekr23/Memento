'use server';

import { revalidatePath } from 'next/cache';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AlbumContributionRow, AlbumPhotoRow } from '@/lib/supabase/types';

import type { ActionResult } from '@/features/album-save/actions';
import { nameOf } from '@/features/auth/name';

import {
  MAX_PHOTOS_PER_SUBMISSION,
  type ContributionInput,
  type InviteTarget,
} from './contract';

/**
 * O lado servidor da caixa de entrada por convite (Fase 3 · A2).
 *
 * A divisão de trabalho é a mesma da Fase 2: os *bytes* das fotos vão do
 * navegador direto para o Storage, e tudo que grava metadado passa por aqui.
 * O que muda é quem está do outro lado — não o dono do álbum, mas um convidado
 * que só tem o token do convite.
 *
 * Por isso cada função abaixo é escrita partindo do princípio de que a chamada
 * pode vir adulterada: nenhuma delas confia no `albumId` que recebe sem
 * confirmar de quem ele é, e nenhuma monta caminho de Storage com dado do
 * cliente sem conferir o prefixo. A RLS já recusaria a maior parte disso —
 * estas conferências existem para o pedido errado morrer com uma frase legível
 * em vez de um erro de política.
 */

const NOT_SIGNED_IN = 'Entre na sua conta para continuar.';
const INVITE_GONE =
  'Este convite não vale mais. Peça um link novo para quem montou o álbum.';

/** O mesmo teto de `album-save`: um álbum guardado na nuvem cabe até isto. */
const MAX_PHOTOS_PER_ALBUM = 500;

function safeInt(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= max ? rounded : null;
}

function safeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Convite: abrir e fechar ────────────────────────────────────────────────

/**
 * Abre (ou renova) o convite e devolve o token.
 *
 * Renovar e abrir são a mesma operação de propósito: gerar um token novo
 * invalida o anterior no mesmo instante, que é exatamente o que "revogar e
 * reabrir" quer dizer. Um álbum tem um convite válido por vez.
 */
export async function openInvite(albumId: string): Promise<ActionResult<string>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const token = crypto.randomUUID();

  const { error } = await supabase
    .from('albums')
    .update({ invite_token: token })
    .eq('id', albumId)
    .eq('user_id', user.id)
    // Convite para um rascunho não faz sentido: o convidado abriria um álbum
    // que ainda está subindo.
    .eq('status', 'ready');

  if (error) {
    console.error('[album-contrib] falha ao abrir o convite', error);
    return { ok: false, error: 'Não foi possível criar o link de convite.' };
  }

  revalidatePath(`/album/${albumId}`);
  return { ok: true, data: token };
}

/**
 * Fecha o convite.
 *
 * O que já está na caixa de entrada **continua lá**: fechar o convite tranca a
 * porta, não joga fora o que entrou por ela. O dono ainda decide foto por foto.
 */
export async function closeInvite(albumId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const { error } = await supabase
    .from('albums')
    .update({ invite_token: null })
    .eq('id', albumId)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: 'Não foi possível revogar o convite.' };

  revalidatePath(`/album/${albumId}`);
  return { ok: true, data: null };
}

// ── Convite: do lado de quem recebeu o link ────────────────────────────────

/**
 * Que álbum este token abre.
 *
 * Passa por uma função `security definer` no banco porque o convidado não tem
 * — e não deve ter — permissão de ler a linha do álbum. O que volta é o mínimo
 * para a tela de envio existir: nome do álbum, de quem o montou, e o id do dono
 * (que compõe o caminho do arquivo no Storage). Nem composição, nem fotos: o
 * convite dá direito de *enviar*, não de *ver*.
 */
export async function resolveInvite(
  token: string,
): Promise<ActionResult<InviteTarget>> {
  if (!UUID.test(token)) return { ok: false, error: INVITE_GONE };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc('album_by_invite', { token })
    .maybeSingle<{
      id: string;
      owner_id: string;
      title: string;
      author_name: string;
    }>();

  if (error || !data) return { ok: false, error: INVITE_GONE };

  return {
    ok: true,
    data: {
      albumId: data.id,
      ownerId: data.owner_id,
      title: data.title,
      authorName: data.author_name,
    },
  };
}

/**
 * Registra o que o convidado acabou de subir.
 *
 * Os arquivos já estão no Storage quando esta função roda — é o mesmo desenho
 * de `finalizeAlbum`: bytes primeiro, índice depois. Um envio interrompido no
 * meio deixa objetos sem linha, que o dono nunca vê e que somem junto com o
 * álbum; o contrário (linha sem arquivo) apareceria na caixa de entrada como
 * um quadrado quebrado.
 */
export async function recordContributions(input: {
  albumId: string;
  photos: ContributionInput[];
}): Promise<ActionResult<number>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  if (input.photos.length === 0) {
    return { ok: false, error: 'Escolha ao menos uma foto.' };
  }
  if (input.photos.length > MAX_PHOTOS_PER_SUBMISSION) {
    return {
      ok: false,
      error: `Dá para mandar até ${MAX_PHOTOS_PER_SUBMISSION} fotos por vez.`,
    };
  }

  const rows = [];
  for (const photo of input.photos) {
    // O id vem do navegador porque o caminho do arquivo o contém — e o arquivo
    // sobe antes da linha existir. Formato errado aqui é chamada forjada.
    if (!UUID.test(photo.id)) {
      return { ok: false, error: 'O envio veio inválido. Tente de novo.' };
    }
    // O caminho também vem do navegador. A RLS confere o mesmo prefixo, mas
    // recusar aqui dá uma frase em vez de um erro de política.
    if (!photo.storagePath.endsWith(`/${input.albumId}/contrib/${photo.id}.jpg`)) {
      return { ok: false, error: 'O envio veio inválido. Tente de novo.' };
    }
    rows.push({
      id: photo.id,
      album_id: input.albumId,
      contributor_id: user.id,
      contributor_name: nameOf(user),
      storage_path: photo.storagePath,
      file_name: String(photo.fileName ?? '').slice(0, 255),
      width: safeInt(photo.width, 100000),
      height: safeInt(photo.height, 100000),
      taken_at: safeIso(photo.takenAt),
      timestamp_source: photo.timestampSource === 'exif' ? 'exif' : 'file',
      status: 'pending' as const,
    });
  }

  const { error } = await supabase.from('album_contributions').insert(rows);
  if (error) {
    console.error('[album-contrib] falha ao registrar o envio', error);
    return {
      ok: false,
      error:
        'As fotos subiram, mas o aviso para o dono do álbum falhou. Tente enviar de novo.',
    };
  }

  revalidatePath(`/album/${input.albumId}`);
  return { ok: true, data: rows.length };
}

// ── Moderação, do lado do dono ─────────────────────────────────────────────

/** A contribuição, conferida como pertencente a um álbum deste usuário. */
async function ownedContribution(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  contributionId: string,
): Promise<AlbumContributionRow | null> {
  if (!UUID.test(contributionId)) return null;

  const { data } = await supabase
    .from('album_contributions')
    .select('*')
    .eq('id', contributionId)
    .maybeSingle<AlbumContributionRow>();

  if (!data) return null;

  // A política de leitura deixa o *autor* ler a própria contribuição também —
  // e o autor não pode moderar. O caminho começa com o id do dono, então é ele
  // quem responde "este álbum é seu?" sem uma consulta a mais.
  if (!data.storage_path.startsWith(`${userId}/${data.album_id}/`)) return null;

  return data;
}

/**
 * Aprova: a foto entra no álbum.
 *
 * Nenhum byte se move. O arquivo já está em `{dono}/{álbum}/contrib/…`, que é
 * dentro da pasta do álbum — então basta uma linha em `album_photos` apontando
 * para ele. É essa decisão de caminho, lá no schema, que faz aprovar custar uma
 * consulta em vez de um download e um reupload.
 *
 * A foto entra no fim da fila (`position`), mas **não** aparece no fim do
 * álbum: a paginação agrupa por `taken_at`, então uma foto do dia 2 cai no dia
 * 2 sozinha. A `composition` não é tocada — ela guarda ajustes por foto, e uma
 * foto recém-chegada ainda não tem nenhum.
 */
export async function approveContribution(
  contributionId: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const contribution = await ownedContribution(supabase, user.id, contributionId);
  if (!contribution) return { ok: false, error: 'Esta foto não está mais aqui.' };
  if (contribution.status === 'approved') return { ok: true, data: null };

  const { data: last } = await supabase
    .from('album_photos')
    .select('position')
    .eq('album_id', contribution.album_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<Pick<AlbumPhotoRow, 'position'>>();

  const position = (last?.position ?? -1) + 1;
  if (position >= MAX_PHOTOS_PER_ALBUM) {
    return {
      ok: false,
      error: `Este álbum já está com ${MAX_PHOTOS_PER_ALBUM} fotos, o máximo na nuvem.`,
    };
  }

  const { error: photoError } = await supabase.from('album_photos').insert({
    id: contribution.id,
    album_id: contribution.album_id,
    position,
    storage_path: contribution.storage_path,
    file_name: contribution.file_name,
    width: contribution.width,
    height: contribution.height,
    taken_at: contribution.taken_at,
    timestamp_source: contribution.timestamp_source,
  });

  if (photoError) {
    console.error('[album-contrib] falha ao aprovar', photoError);
    return { ok: false, error: 'Não foi possível colocar a foto no álbum.' };
  }

  // A marca de aprovada vem *depois* da foto entrar. Na ordem inversa, uma
  // falha no meio deixaria a contribuição fora da caixa de entrada e fora do
  // álbum — sumida. Assim, o pior caso é ela reaparecer como pendente, e
  // aprovar de novo é inofensivo (o `insert` acima já teria acontecido, e o
  // atalho de `status === 'approved'` lá em cima cobre a repetição).
  const { error } = await supabase
    .from('album_contributions')
    .update({ status: 'approved' })
    .eq('id', contribution.id);

  if (error) console.error('[album-contrib] foto entrou, marca falhou', error);

  await bumpPhotoCount(supabase, contribution.album_id);

  revalidatePath(`/album/${contribution.album_id}`);
  revalidatePath('/albums');
  return { ok: true, data: null };
}

/**
 * Descarta: some a linha e some o arquivo.
 *
 * Sem estado `rejected`. Guardar foto que o dono recusou seria ocupar o free
 * tier com imagem que ninguém vai ver — e, pior, manter no servidor uma foto
 * de terceiro que foi explicitamente recusada.
 */
export async function discardContribution(
  contributionId: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const contribution = await ownedContribution(supabase, user.id, contributionId);
  if (!contribution) return { ok: false, error: 'Esta foto não está mais aqui.' };
  if (contribution.status === 'approved') {
    return {
      ok: false,
      error: 'Esta foto já está no álbum — tire-a por lá, na montagem.',
    };
  }

  // O arquivo primeiro, pelo mesmo motivo de `deleteAlbum`: apagar a linha
  // antes deixaria o objeto órfão no bucket, sem nada apontando para ele.
  const { error: removeError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([contribution.storage_path]);

  if (removeError) {
    console.error('[album-contrib] falha ao apagar o arquivo', removeError);
  }

  const { error } = await supabase
    .from('album_contributions')
    .delete()
    .eq('id', contribution.id);

  if (error) return { ok: false, error: 'Não foi possível descartar a foto.' };

  revalidatePath(`/album/${contribution.album_id}`);
  return { ok: true, data: null };
}

/**
 * `photo_count` é campo de vitrine — a lista de álbuns o mostra sem abrir o
 * álbum. Recontar é uma consulta barata (o índice `(album_id, position)` cobre)
 * e é mais honesto do que somar 1 e torcer para nunca dessincronizar.
 */
async function bumpPhotoCount(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  albumId: string,
): Promise<void> {
  const { count } = await supabase
    .from('album_photos')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId);

  if (typeof count === 'number') {
    await supabase.from('albums').update({ photo_count: count }).eq('id', albumId);
  }
}
