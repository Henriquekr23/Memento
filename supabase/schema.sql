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
  id                text primary key check (char_length(id) between 8 and 64),
  album_id          uuid not null references public.albums (id) on delete cascade,
  position          integer not null,
  storage_path      text not null,
  file_name         text not null,
  width             integer,
  height            integer,
  taken_at          timestamptz,
  timestamp_source  text not null default 'file'
                    check (timestamp_source in ('exif', 'file')),
  created_at        timestamptz not null default now()
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

drop policy if exists "fotos: dono escreve" on public.album_photos;
create policy "fotos: dono escreve"
  on public.album_photos for insert
  with check (public.owns_album(album_id));

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
