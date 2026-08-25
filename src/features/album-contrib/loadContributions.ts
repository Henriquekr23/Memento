import 'server-only';

import {
  PHOTOS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  isSupabaseConfigured,
} from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AlbumContributionRow } from '@/lib/supabase/types';

/**
 * A caixa de entrada, lida do lado do servidor.
 *
 * Mesmo desenho de `album-view/loadAlbum`: as URLs são assinadas aqui e chegam
 * prontas na página, sem passo de "carregando…" no cliente e sem chave de API
 * circulando no navegador para montar endereço de imagem.
 */

export interface PendingContribution {
  id: string;
  contributorName: string;
  fileName: string;
  previewUrl: string;
  /** ISO, ou `null` quando a foto não trouxe data alguma. */
  takenAt: string | null;
  createdAt: string;
}

export interface Inbox {
  pending: PendingContribution[];
  /** Quantas pessoas diferentes mandaram o que está esperando. */
  contributorCount: number;
}

const EMPTY: Inbox = { pending: [], contributorCount: 0 };

/**
 * O que está esperando aprovação neste álbum.
 *
 * Só o dono recebe algo: a RLS deixa o autor ler as *próprias* contribuições,
 * então o `eq('album_id', …)` sozinho traria, para um convidado, o que ele
 * mesmo mandou. O filtro por dono não é redundante com a política — é a mesma
 * distinção de `listMyAlbums`: a RLS *autoriza*, o app *seleciona*.
 */
export async function loadInbox(
  albumId: string,
  isOwner: boolean,
): Promise<Inbox> {
  if (!isSupabaseConfigured || !isOwner) return EMPTY;

  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from('album_contributions')
    .select('*')
    .eq('album_id', albumId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .returns<AlbumContributionRow[]>();

  if (!rows || rows.length === 0) return EMPTY;

  // Uma chamada para o lote inteiro, como no álbum: assinar uma a uma seria
  // uma ida à rede por foto.
  const { data: signed } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map(
    (signed ?? []).map((item) => [item.path ?? '', item.signedUrl]),
  );

  const pending = rows.flatMap((row) => {
    const url = urlByPath.get(row.storage_path);
    // Linha sem arquivo é envio que morreu no meio. Some da tela em vez de
    // virar um quadrado quebrado que o dono não consegue nem descartar.
    if (!url) return [];
    return [
      {
        id: row.id,
        contributorName: row.contributor_name,
        fileName: row.file_name,
        previewUrl: url,
        takenAt: row.taken_at,
        createdAt: row.created_at,
      } satisfies PendingContribution,
    ];
  });

  return {
    pending,
    contributorCount: new Set(rows.map((row) => row.contributor_id)).size,
  };
}
