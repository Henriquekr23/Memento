import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { AlbumEditorRow } from '@/lib/supabase/types';

/**
 * Quem está montando o álbum junto com o dono.
 *
 * Espelha `loadInbox`: recebe o `isOwner` já decidido e devolve vazio para
 * qualquer outro visitante sem tocar no banco. A RLS diria o mesmo, mas uma
 * consulta que não precisa acontecer é uma ida à rede a menos na página que
 * mais faz consultas.
 */

export interface Collaborator {
  userId: string;
  name: string;
  joinedAt: string;
}

export async function loadCollaborators(
  albumId: string,
  isOwner: boolean,
): Promise<Collaborator[]> {
  if (!isSupabaseConfigured || !isOwner) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('album_editors')
    .select('user_id, editor_name, joined_at')
    .eq('album_id', albumId)
    .order('joined_at', { ascending: true })
    .returns<Pick<AlbumEditorRow, 'user_id' | 'editor_name' | 'joined_at'>[]>();

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.editor_name,
    joinedAt: row.joined_at,
  }));
}
