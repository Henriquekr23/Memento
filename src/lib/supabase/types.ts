/**
 * Formato das linhas do banco.
 *
 * Escrito à mão em vez de gerado pelo CLI: são três tabelas, e uma dependência
 * de ferramenta a mais custaria mais do que resolve. Se o esquema crescer,
 * `npx supabase gen types typescript` gera este arquivo e nada mais muda —
 * o resto do código só importa os tipos daqui.
 *
 * Espelha `supabase/schema.sql`. Mexeu num, confira o outro.
 */

export type AlbumStatus = 'draft' | 'ready';

/** O que o link de convite dá a quem entra por ele. */
export type AlbumInviteRole = 'contribute' | 'edit';

export interface AlbumRow {
  id: string;
  user_id: string;
  title: string;
  /** Nome de quem montou, copiado do cadastro ao salvar. */
  author_name: string;
  status: AlbumStatus;
  is_public: boolean;
  /**
   * Link de convite (Fase 3 · A2). `null` = convite fechado — o estado padrão
   * e o de todo álbum criado antes desta feature. Revogar é apagar o token.
   */
  invite_token: string | null;
  /**
   * Papel do convite corrente (Fase 3 · A3). `contribute` recebe fotos numa
   * caixa de entrada; `edit` abre a bancada para quem entrar pelo link.
   */
  invite_role: AlbumInviteRole;
  /**
   * Quando o álbum foi dado por pronto (Fase 3 · A3). `null` = ainda em
   * montagem. Álbum finalizado não aceita edição nem contribuição.
   */
  locked_at: string | null;
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

/**
 * Uma foto que chegou pelo link de convite e ainda não é do álbum.
 *
 * Vive na antessala: o arquivo já está no Storage, na pasta do dono, mas só
 * vira `AlbumPhotoRow` quando o dono aprova. Descartar apaga a linha e o
 * objeto — não existe estado `rejected` guardando foto recusada.
 */
export interface AlbumContributionRow {
  id: string;
  album_id: string;
  contributor_id: string;
  /** Nome de quem mandou, copiado do cadastro no envio. */
  contributor_name: string;
  storage_path: string;
  file_name: string;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  timestamp_source: 'exif' | 'file';
  status: 'pending' | 'approved';
  created_at: string;
}

/**
 * Quem foi convidado a editar e aceitou (Fase 3 · A3).
 *
 * A linha nasce no aceite do convite, por `join_album_as_editor` — a tabela
 * não tem política de insert de propósito. Tirar alguém é apagar a linha; o
 * link de convite continua valendo para quem mais tiver.
 */
export interface AlbumEditorRow {
  album_id: string;
  user_id: string;
  /** Nome de quem entrou, copiado do cadastro no aceite. */
  editor_name: string;
  joined_at: string;
}
