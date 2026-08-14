/**
 * Formato das linhas do banco.
 *
 * Escrito à mão em vez de gerado pelo CLI: são duas tabelas, e uma dependência
 * de ferramenta a mais custaria mais do que resolve. Se o esquema crescer,
 * `npx supabase gen types typescript` gera este arquivo e nada mais muda —
 * o resto do código só importa os tipos daqui.
 *
 * Espelha `supabase/schema.sql`. Mexeu num, confira o outro.
 */

export type AlbumStatus = 'draft' | 'ready';

export interface AlbumRow {
  id: string;
  user_id: string;
  title: string;
  /** Nome de quem montou, copiado do cadastro ao salvar. */
  author_name: string;
  status: AlbumStatus;
  is_public: boolean;
  /** Composição editorial serializada — ver `features/album-save/composition`. */
  composition: unknown;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumPhotoRow {
  id: string;
  album_id: string;
  position: number;
  storage_path: string;
  file_name: string;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  timestamp_source: 'exif' | 'file';
  created_at: string;
}
