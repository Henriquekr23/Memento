-- Memento — Fase 2: esquema de persistência.
--
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase, de uma vez.
-- É idempotente: rodar de novo não quebra nada.
--
-- Modelo de dados, em uma frase: o *conteúdo* do álbum é relacional
-- (uma linha por foto, com posição e caminho no storage) e a *composição*
-- editorial é um documento JSON. A composição é indexada por chaves que só a
-- interface entende (id da foto, chave da página) e muda junto com a UI —
-- colunas SQL para isso seriam uma migração a cada ajuste de layout, sem
-- nenhuma consulta ganhando com elas.

-- ─────────────────────────────────────────────────────────────────────────
-- Tabelas
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.albums (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null default '',
  -- Nome de quem montou, copiado do cadastro na hora de salvar. Fica na linha
  -- do álbum, e não lido de `auth.users`, porque quem abre um link público não
  -- tem (nem deve ter) permissão de ler a tabela de usuários.
  author_name  text not null default '',
  -- 'draft' enquanto as fotos sobem; 'ready' quando o álbum está completo.
  -- Um upload interrompido deixa um rascunho, não um álbum quebrado na lista.
  status       text not null default 'draft' check (status in ('draft', 'ready')),
  is_public    boolean not null default false,
  -- Tema, layouts, legendas, posições livres, páginas de texto: o miolo.
  composition  jsonb not null default '{}'::jsonb,
  photo_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.album_photos (
  -- O id vem do cliente de propósito: a composição referencia cada foto por
  -- ele. Gerar um id novo aqui quebraria todos os ajustes e legendas.
  -- `text`, e não `uuid`: em navegador sem `crypto.randomUUID` (contexto não
  -- seguro) o app gera um id no formato `photo_xxx`. Recusá-lo aqui quebraria
  -- o salvamento por um detalhe que não é do banco.
  id                text not null check (char_length(id) between 8 and 64),
  album_id          uuid not null references public.albums (id) on delete cascade,
  position          integer not null,
  storage_path      text not null,
  file_name         text not null,
  width             integer,
  height            integer,
  taken_at          timestamptz,
  timestamp_source  text not null default 'file'
                    check (timestamp_source in ('exif', 'file')),
  created_at        timestamptz not null default now(),

  -- A chave é o par, não o id sozinho. O id da foto é gerado no navegador uma
  -- vez por importação e continua o mesmo enquanto a aba estiver aberta —
  -- então salvar o mesmo conjunto de fotos duas vezes (o gesto mais natural
  -- depois de mexer no álbum) criava um álbum novo com os *mesmos* ids e
  -- esbarrava na chave primária. Único por álbum é o que o app realmente
  -- precisa: a composição referencia a foto dentro do próprio álbum.
  primary key (album_id, id)
);

-- ── Reconciliação ────────────────────────────────────────────────────────
-- `create table if not exists` **não** altera uma tabela que já existe: quem
-- rodou uma versão anterior deste arquivo fica com o formato antigo e sem
-- nenhum aviso. As linhas abaixo acertam isso e podem rodar quantas vezes for.

alter table public.albums
  add column if not exists author_name text not null default '';

-- O id da foto é gerado pelo navegador. Onde `crypto.randomUUID` não existe
-- (contexto não seguro — abrir o app pelo IP da rede local, por exemplo, em vez
-- de localhost), ele cai num id do tipo `photo_ab12…`, que não é um UUID. Com a
-- coluna `uuid`, o Postgres recusa a linha inteira com "invalid input syntax for
-- type uuid" e o álbum falha depois das fotos já terem subido.
alter table public.album_photos
  alter column id type text;

-- Chave primária antiga (só `id`) → chave composta (`album_id`, `id`).
-- Com a antiga, salvar o mesmo conjunto de fotos num segundo álbum falhava com
-- "duplicate key value violates unique constraint" **depois** de todas as
-- fotos já terem subido para o Storage.
do $$
declare
  key_columns integer;
begin
  select cardinality(c.conkey) into key_columns
  from pg_constraint c
  where c.conrelid = 'public.album_photos'::regclass and c.contype = 'p';

  if key_columns = 1 then
    -- Linhas de instalações antigas podem ter ids repetidos entre álbuns? Não:
    -- a chave antiga justamente os impedia. A troca é segura.
    alter table public.album_photos drop constraint album_photos_pkey;
    alter table public.album_photos
      add constraint album_photos_pkey primary key (album_id, id);
  end if;
end $$;

-- ── Limites de tamanho ───────────────────────────────────────────────────
-- Os mesmos tetos que `album-save/actions.ts` aplica, agora onde não dá para
-- pular. O server action não é a única porta do banco: quem tem a chave
-- publicável — isto é, qualquer visitante — pode falar direto com o PostgREST
-- e inserir a linha sem passar por `finalizeAlbum`. A RLS deixa, porque ela só
-- pergunta "este álbum é seu?". Validação que só existe no servidor protege o
-- caminho feliz; estas restrições protegem o banco.
--
-- O `update` antes de cada restrição não é zelo excessivo: uma linha já gravada
-- fora do limite faria o `alter table` falhar e derrubaria a execução inteira
-- deste arquivo no meio.

update public.albums set title = left(title, 200) where char_length(title) > 200;
update public.albums set author_name = left(author_name, 200)
  where char_length(author_name) > 200;
update public.albums set photo_count = 0 where photo_count < 0;

update public.album_photos set file_name = left(file_name, 255)
  where char_length(file_name) > 255;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'albums_sizes' and conrelid = 'public.albums'::regclass
  ) then
    alter table public.albums add constraint albums_sizes check (
      char_length(title) <= 200
      and char_length(author_name) <= 200
      and photo_count >= 0
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'album_photos_sizes' and conrelid = 'public.album_photos'::regclass
  ) then
    alter table public.album_photos add constraint album_photos_sizes check (
      char_length(file_name) <= 255
      and char_length(storage_path) <= 512
      and position >= 0
      and position < 1000
    );
  end if;
end $$;

-- Teto de fotos por álbum, no banco.
--
-- `finalizeAlbum` já recusa mais de 500, mas uma chamada forjada direto ao
-- PostgREST não passa por ele — e um `insert` de dezenas de milhares de linhas
-- encheria os 500 MB do free tier sem violar nenhuma política.
--
-- Por statement e com tabela de transição, não por linha: salvar um álbum é um
-- `insert` único de até 500 linhas, e um gatilho por linha faria 500 contagens
-- onde uma basta. A contagem usa o índice `(album_id, position)`.
create or replace function public.enforce_album_photo_cap()
returns trigger language plpgsql as $$
declare
  offender uuid;
begin
  select touched.album_id into offender
  from (select distinct album_id from new_rows) as touched
  where (
    select count(*) from public.album_photos ap where ap.album_id = touched.album_id
  ) > 500
  limit 1;

  if offender is not null then
    raise exception 'teto de fotos por álbum excedido';
  end if;

  return null;
end $$;

drop trigger if exists album_photos_cap on public.album_photos;
create trigger album_photos_cap
  after insert on public.album_photos
  referencing new table as new_rows
  for each statement execute function public.enforce_album_photo_cap();

create index if not exists album_photos_album_position_idx
  on public.album_photos (album_id, position);

create index if not exists albums_user_created_idx
  on public.albums (user_id, created_at desc);

-- updated_at automático: a lista ordena por ele.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists albums_touch_updated_at on public.albums;
create trigger albums_touch_updated_at
  before update on public.albums
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — ligada antes de qualquer linha existir
-- ─────────────────────────────────────────────────────────────────────────

alter table public.albums       enable row level security;
alter table public.album_photos enable row level security;

drop policy if exists "albums: dono lê" on public.albums;
create policy "albums: dono lê"
  on public.albums for select
  using (auth.uid() = user_id);

-- Álbum público é legível por qualquer um, inclusive sem conta — é o link
-- compartilhável. Rascunho nunca aparece, mesmo marcado como público.
drop policy if exists "albums: público lê" on public.albums;
create policy "albums: público lê"
  on public.albums for select
  to anon, authenticated
  using (is_public and status = 'ready');

drop policy if exists "albums: dono cria" on public.albums;
create policy "albums: dono cria"
  on public.albums for insert
  with check (auth.uid() = user_id);

drop policy if exists "albums: dono edita" on public.albums;
create policy "albums: dono edita"
  on public.albums for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "albums: dono apaga" on public.albums;
create policy "albums: dono apaga"
  on public.albums for delete
  using (auth.uid() = user_id);

-- As fotos herdam a permissão do álbum. Uma função marcada `security definer`
-- evita recursão de política e deixa a regra escrita num lugar só.
create or replace function public.can_read_album(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.albums a
    where a.id = target
      and (a.user_id = auth.uid() or (a.is_public and a.status = 'ready'))
  );
$$;

create or replace function public.owns_album(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.albums a
    where a.id = target and a.user_id = auth.uid()
  );
$$;

drop policy if exists "fotos: quem lê o álbum lê as fotos" on public.album_photos;
create policy "fotos: quem lê o álbum lê as fotos"
  on public.album_photos for select
  to anon, authenticated
  using (public.can_read_album(album_id));

-- O `starts_with` repete a conferência que `finalizeAlbum` já faz — de novo
-- porque o server action é evitável e a política não é. Sem ele, a linha pode
-- apontar para qualquer lugar do bucket: as políticas de `storage.objects`
-- continuam impedindo a leitura do arquivo de outra pessoa, mas o índice do
-- álbum deixaria de descrever o que está guardado, e a exclusão em
-- `deleteAlbum` (que varre a pasta `{usuário}/{álbum}`) passaria longe do
-- arquivo. A convenção do caminho é `{usuário}/{álbum}/{foto}.jpg`: mudou aqui,
-- mude em `saveAlbum.ts` e nas políticas de storage lá embaixo.
drop policy if exists "fotos: dono escreve" on public.album_photos;
create policy "fotos: dono escreve"
  on public.album_photos for insert
  with check (
    public.owns_album(album_id)
    and starts_with(storage_path, auth.uid()::text || '/' || album_id::text || '/')
  );

drop policy if exists "fotos: dono apaga" on public.album_photos;
create policy "fotos: dono apaga"
  on public.album_photos for delete
  using (public.owns_album(album_id));

-- ─────────────────────────────────────────────────────────────────────────
-- Storage — bucket privado "photos"
-- Caminho de cada arquivo: {user_id}/{album_id}/{photo_id}.jpg
-- É essa convenção que faz as políticas abaixo funcionarem sem consulta extra.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg'];

drop policy if exists "photos: dono envia" on storage.objects;
create policy "photos: dono envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos: dono lê" on storage.objects;
create policy "photos: dono lê"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos: dono apaga" on storage.objects;
create policy "photos: dono apaga"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Álbum público: qualquer visitante pode assinar as URLs das fotos daquele
-- álbum — e só daquele. É isto que dispensa a `service_role key` no servidor;
-- o app inteiro roda com a chave publicável.
drop policy if exists "photos: álbum público é legível" on storage.objects;
create policy "photos: álbum público é legível"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.albums a
      where a.is_public
        and a.status = 'ready'
        and a.id::text = (storage.foldername(name))[2]
    )
  );
