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
--
-- Condicional porque `alter column ... type` reescreve a tabela inteira: rodar
-- este arquivo de novo numa base já acertada não deve custar isso.
do $$
begin
  if exists (
    select 1 from pg_attribute a
    where a.attrelid = 'public.album_photos'::regclass
      and a.attname = 'id'
      and a.atttypid <> 'text'::regtype
  ) then
    alter table public.album_photos alter column id type text;
  end if;
end $$;

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

  -- O `check (char_length(id) between 8 and 64)` da definição da tabela só
  -- nasce junto com ela: numa base criada por versão anterior, `create table
  -- if not exists` pulou a tabela inteira e o limite nunca existiu. Como
  -- constraint separada, e não dentro de `album_photos_sizes`, porque essa
  -- outra já existe nas bases que rodaram a versão anterior deste arquivo —
  -- e o `if not exists` a pularia junto com o limite novo.
  if not exists (
    select 1 from pg_constraint
    where conname = 'album_photos_id_size' and conrelid = 'public.album_photos'::regclass
  ) and not exists (
    -- Uma linha antiga fora do limite faria o `alter table` derrubar a
    -- execução inteira. Nenhum id de verdade cai aqui (uuid tem 36
    -- caracteres), então o aviso é sinal de linha adulterada, não de rotina.
    select 1 from public.album_photos where char_length(id) not between 8 and 64
  ) then
    alter table public.album_photos add constraint album_photos_id_size
      check (char_length(id) between 8 and 64);
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

-- ═════════════════════════════════════════════════════════════════════════
-- Fase 3 · A2 — Álbuns colaborativos leves (caixa de entrada por convite)
--
-- O que muda no modelo, em uma frase: o álbum ganha um *segundo* link — o de
-- convite — e uma antessala. Quem entra por ele manda fotos, mas essas fotos
-- não viram álbum: viram linhas em `album_contributions`, esperando o dono
-- aprovar. O álbum continua com um dono só e uma pessoa só editando a
-- composição — nada aqui é edição simultânea.
--
-- Duas escolhas que economizam muito código depois:
--
-- 1. **O convidado grava direto na pasta do dono**, em
--    `{dono}/{álbum}/contrib/{id}.jpg`. Aprovar é então só inserir a linha em
--    `album_photos` apontando para o arquivo que já está lá — sem cópia entre
--    pastas, sem gastar duas vezes o 1 GB do free tier, sem download e reupload
--    pelo servidor. Descartar é apagar o objeto, que o dono já pode fazer.
-- 2. **Contribuir exige conta.** Sem isso, a política de escrita no Storage
--    teria de aceitar `anon` gravando na pasta de outra pessoa — uma porta que
--    só o token de convite fecharia. Com login, cada envio tem um `auth.uid()`
--    atrás, dá para limitar por pessoa e dá para mostrar ao dono quem mandou.
-- ═════════════════════════════════════════════════════════════════════════

-- Token do convite. `null` = convite fechado (o padrão, e o estado de todo
-- álbum que já existe). Revogar é apagar o token: o link antigo morre na hora
-- e um convite novo nasce com outro token.
alter table public.albums
  add column if not exists invite_token uuid;

create unique index if not exists albums_invite_token_idx
  on public.albums (invite_token)
  where invite_token is not null;

create table if not exists public.album_contributions (
  -- Id gerado no navegador, como o de `album_photos` e pelo mesmo motivo: o
  -- caminho do arquivo no Storage contém o id, e o arquivo sobe *antes* da
  -- linha existir.
  id                uuid primary key,
  album_id          uuid not null references public.albums (id) on delete cascade,
  contributor_id    uuid not null references auth.users (id) on delete cascade,
  -- Copiado do cadastro no envio, não lido depois: o dono precisa ver "enviado
  -- por Ana" sem ter permissão de ler `auth.users`. Mesma decisão de
  -- `albums.author_name`.
  contributor_name  text not null default '',
  storage_path      text not null,
  file_name         text not null,
  width             integer,
  height            integer,
  taken_at          timestamptz,
  timestamp_source  text not null default 'file'
                    check (timestamp_source in ('exif', 'file')),
  -- `rejected` não existe: descartar apaga a linha e o arquivo. Guardar o que
  -- o dono recusou seria ocupar o free tier com foto que ninguém vai ver — e
  -- guardar foto de terceiro que foi explicitamente recusada.
  status            text not null default 'pending'
                    check (status in ('pending', 'approved')),
  created_at        timestamptz not null default now(),

  constraint album_contributions_sizes check (
    char_length(file_name) <= 255
    and char_length(storage_path) <= 512
    and char_length(contributor_name) <= 200
  )
);

create index if not exists album_contributions_album_idx
  on public.album_contributions (album_id, status, created_at desc);

-- ── Tetos ────────────────────────────────────────────────────────────────
-- O link de convite é público por natureza: quem o tiver, escreve. Sem teto,
-- uma pessoa só enche o 1 GB do free tier do dono. Os dois limites são
-- diferentes de propósito — um protege o álbum, o outro impede que uma única
-- pessoa domine a caixa de entrada.
create or replace function public.enforce_contribution_caps()
returns trigger language plpgsql as $$
declare
  pending_in_album integer;
  pending_from_person integer;
begin
  select count(*) into pending_in_album
  from public.album_contributions
  where album_id = new.album_id and status = 'pending';

  if pending_in_album > 300 then
    raise exception 'a caixa de entrada deste álbum está cheia';
  end if;

  select count(*) into pending_from_person
  from public.album_contributions
  where album_id = new.album_id
    and contributor_id = new.contributor_id
    and status = 'pending';

  if pending_from_person > 100 then
    raise exception 'você já enviou fotos demais para este álbum';
  end if;

  return null;
end $$;

drop trigger if exists album_contributions_caps on public.album_contributions;
create trigger album_contributions_caps
  after insert on public.album_contributions
  for each row execute function public.enforce_contribution_caps();

-- ── Funções de apoio ─────────────────────────────────────────────────────

-- Cast que não derruba a transação. Dentro de uma política de RLS, um
-- `'lixo'::uuid` levanta exceção e o `insert` inteiro morre com uma mensagem
-- do Postgres em vez de um "não autorizado" limpo.
create or replace function public.try_uuid(value text)
returns uuid language plpgsql immutable as $$
begin
  return value::uuid;
exception when others then
  return null;
end $$;

-- O convite está aberto e o caminho aponta para a pasta do dono deste álbum?
-- `security definer` porque quem pergunta é justamente quem **não** pode ler a
-- linha do álbum: o convidado.
create or replace function public.can_contribute(album_folder text, owner_folder text)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.albums a
    where a.id = public.try_uuid(album_folder)
      and a.invite_token is not null
      and a.status = 'ready'
      and a.user_id::text = owner_folder
  );
$$;

-- O álbum que um token de convite abre. Devolve o `user_id` de propósito: é
-- ele que compõe o caminho do arquivo no Storage, e o convidado não tem como
-- descobri-lo de outro jeito. Não devolve nada além disso — nem a composição,
-- nem as fotos: o convite dá direito de *enviar*, não de *ver* o álbum.
create or replace function public.album_by_invite(token uuid)
returns table (id uuid, owner_id uuid, title text, author_name text)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, a.title, a.author_name
  from public.albums a
  where a.invite_token = token and a.status = 'ready';
$$;

revoke execute on function public.album_by_invite(uuid) from public;
grant execute on function public.album_by_invite(uuid) to anon, authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.album_contributions enable row level security;

-- O dono vê a caixa de entrada inteira; o convidado vê só o que ele mesmo
-- mandou (é o que sustenta a tela de "enviei, e agora?").
drop policy if exists "contribuições: dono e autor leem" on public.album_contributions;
create policy "contribuições: dono e autor leem"
  on public.album_contributions for select to authenticated
  using (public.owns_album(album_id) or contributor_id = auth.uid());

-- As duas últimas condições são o mesmo cuidado de `album_photos`: sem elas a
-- linha pode apontar para qualquer objeto do bucket, e aprovar a contribuição
-- colocaria esse objeto dentro do álbum. A política de Storage impediria a
-- *leitura*, mas o índice do álbum já estaria mentindo.
drop policy if exists "contribuições: convidado envia" on public.album_contributions;
create policy "contribuições: convidado envia"
  on public.album_contributions for insert to authenticated
  with check (
    contributor_id = auth.uid()
    and status = 'pending'
    and public.can_contribute(album_id::text, split_part(storage_path, '/', 1))
    and storage_path like
      split_part(storage_path, '/', 1) || '/' || album_id::text || '/contrib/%'
  );

-- Só o dono muda o estado — é o ato de curadoria do álbum.
drop policy if exists "contribuições: dono modera" on public.album_contributions;
create policy "contribuições: dono modera"
  on public.album_contributions for update to authenticated
  using (public.owns_album(album_id))
  with check (public.owns_album(album_id));

-- Descartar é do dono; desistir do que mandou, do convidado — e só enquanto
-- ainda está pendente. Depois de aprovada, a foto é do álbum.
drop policy if exists "contribuições: dono descarta, autor desiste" on public.album_contributions;
create policy "contribuições: dono descarta, autor desiste"
  on public.album_contributions for delete to authenticated
  using (
    public.owns_album(album_id)
    or (contributor_id = auth.uid() and status = 'pending')
  );

-- ── Storage ──────────────────────────────────────────────────────────────
-- A única porta nova no bucket: o convidado grava na subpasta `contrib` do
-- álbum de outra pessoa. Fora dela nada muda — as políticas da Fase 2
-- continuam valendo palavra por palavra, e o dono já lê e apaga tudo que está
-- na própria pasta, inclusive o que chegou por convite.
drop policy if exists "photos: convidado envia para a caixa de entrada" on storage.objects;
create policy "photos: convidado envia para a caixa de entrada"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and array_length(storage.foldername(name), 1) = 3
    and (storage.foldername(name))[3] = 'contrib'
    and public.can_contribute(
      (storage.foldername(name))[2],
      (storage.foldername(name))[1]
    )
  );

-- ═════════════════════════════════════════════════════════════════════════
-- Fase 3 · A3 — Álbum que continua editável, convite que também edita,
--               e o gesto de dar o álbum por pronto
--
-- Três coisas novas, e vale dizer em uma frase por que elas são uma só:
--
-- 1. **O álbum salvo volta para a bancada.** Antes, salvar era um ponto final:
--    a composição virava linha no banco e a única forma de mudar alguma coisa
--    era montar outro álbum do zero. Agora `/album/{id}/editar` reabre o mesmo
--    álbum, e salvar reescreve a linha em vez de criar outra.
-- 2. **O convite ganha um papel.** O mesmo link que hoje só recebe fotos pode
--    ser aberto como convite de *edição*: quem entra por ele monta o álbum
--    junto com o dono. Continua sendo uma pessoa por vez mexendo — não há
--    edição simultânea aqui, e a última gravação vence.
-- 3. **`locked_at` é o "enviei".** Um álbum finalizado para de aceitar edição
--    e para de aceitar contribuição. É o estado em que o álbum foi para a
--    gráfica e ninguém deve mais mexer.
--
-- A decisão que organiza o resto: **o colaborador não recebe `update` na
-- tabela `albums`**. RLS decide linha, não coluna — uma política de update
-- para colaborador deixaria ele trocar `is_public`, `invite_token` ou até
-- `user_id` falando direto com o PostgREST. Por isso a gravação da composição
-- passa por uma função `security definer` (`save_album_composition`) que
-- escreve exatamente três colunas. O dono continua com a política normal, que é
-- o que o deixa reabrir um álbum finalizado — a tranca é do conteúdo, não do
-- dono.
-- ═════════════════════════════════════════════════════════════════════════

-- Papel do convite corrente. 'contribute' é o comportamento da A2 e o padrão
-- de todo álbum que já existe: o link recebe fotos e não mostra o álbum.
-- 'edit' abre a bancada para quem entrar. Um álbum tem um convite por vez, e
-- portanto um papel por vez — trocar o papel é gerar outro link.
alter table public.albums
  add column if not exists invite_role text not null default 'contribute';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'albums_invite_role' and conrelid = 'public.albums'::regclass
  ) then
    update public.albums set invite_role = 'contribute'
      where invite_role not in ('contribute', 'edit');
    alter table public.albums add constraint albums_invite_role
      check (invite_role in ('contribute', 'edit'));
  end if;
end $$;

-- Quando o álbum foi dado por pronto. `null` = ainda em montagem, que é o
-- estado de todo álbum existente. Guardamos o instante, e não um booleano,
-- porque a data é o que a tela mostra ("finalizado em 12 de março") e o
-- booleano se deduz dela.
alter table public.albums
  add column if not exists locked_at timestamptz;

-- Quem foi convidado a editar e aceitou.
--
-- A linha nasce no aceite, não no convite: o token não sabe para quem foi
-- mandado, e é o aceite que dá nome e id a quem entrou. Revogar é apagar a
-- linha — o link pode continuar aberto sem que aquela pessoa volte.
create table if not exists public.album_editors (
  album_id    uuid not null references public.albums (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Copiado do cadastro no aceite, pelo mesmo motivo de `albums.author_name`
  -- e de `album_contributions.contributor_name`: o dono precisa ver quem está
  -- junto sem ter permissão de ler `auth.users`.
  editor_name text not null default '',
  joined_at   timestamptz not null default now(),

  primary key (album_id, user_id),
  constraint album_editors_sizes check (char_length(editor_name) <= 200)
);

create index if not exists album_editors_user_idx
  on public.album_editors (user_id, joined_at desc);

-- Teto de colaboradores. O link de convite é público por natureza: sem teto,
-- um link vazado enche a tabela e dá acesso de escrita a um número arbitrário
-- de contas.
create or replace function public.enforce_album_editor_cap()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from public.album_editors where album_id = new.album_id
  ) > 20 then
    raise exception 'este álbum já tem colaboradores demais';
  end if;
  return null;
end $$;

drop trigger if exists album_editors_cap on public.album_editors;
create trigger album_editors_cap
  after insert on public.album_editors
  for each row execute function public.enforce_album_editor_cap();

-- ── Funções de apoio ─────────────────────────────────────────────────────

-- "Esta pessoa está na lista de colaboradores deste álbum?"
-- `security definer` porque quem pergunta, nas políticas de `albums`, é
-- justamente quem ainda não tem permissão de ler a linha do álbum.
create or replace function public.edits_album(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.album_editors e
    where e.album_id = target and e.user_id = auth.uid()
  );
$$;

-- "Esta pessoa pode mexer no conteúdo deste álbum agora?"
-- Repare no `locked_at is null`: a tranca vale para o dono também. Ela não é
-- uma questão de permissão, é o estado do álbum — e é por isso que ela mora
-- aqui, e não numa conferência do lado do servidor Next que uma chamada direta
-- ao PostgREST pularia.
create or replace function public.can_edit_album(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.albums a
    where a.id = target
      and a.status = 'ready'
      and a.locked_at is null
      and (
        a.user_id = auth.uid()
        or exists (
          select 1 from public.album_editors e
          where e.album_id = a.id and e.user_id = auth.uid()
        )
      )
  );
$$;

-- Dono do álbum. É o primeiro pedaço do caminho de toda foto no Storage, e o
-- colaborador não tem como descobri-lo de outro jeito.
create or replace function public.album_owner(target uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select a.user_id from public.albums a where a.id = target;
$$;

-- A versão por pasta, para as políticas de `storage.objects` — que só têm o
-- caminho do arquivo em mãos. Espelha `can_contribute`.
create or replace function public.can_edit_album_folder(
  album_folder text,
  owner_folder text
)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_edit_album(public.try_uuid(album_folder))
    and public.album_owner(public.try_uuid(album_folder))::text = owner_folder;
$$;

-- ── Gravar a composição sem abrir a tabela inteira ───────────────────────
--
-- O colaborador precisa escrever `title`, `composition` e `photo_count` — e
-- **só**. Uma política de update daria a linha inteira, incluindo `is_public`,
-- `invite_token`, `locked_at` e `user_id`; RLS não filtra coluna. Esta função
-- é a coluna que falta: ela roda como dona da tabela, confere `can_edit_album`
-- (que já inclui a tranca) e escreve os três campos.
--
-- O dono passa por aqui também. Um caminho só para os dois é o que garante que
-- "álbum finalizado não aceita gravação" não tenha uma porta lateral.
create or replace function public.save_album_composition(
  target uuid,
  new_title text,
  new_composition jsonb,
  new_photo_count integer
)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.can_edit_album(target) then
    return false;
  end if;

  update public.albums
  set title = left(coalesce(new_title, ''), 200),
      composition = coalesce(new_composition, '{}'::jsonb),
      photo_count = greatest(coalesce(new_photo_count, 0), 0)
  where id = target;

  return true;
end $$;

revoke execute on function public.save_album_composition(uuid, text, jsonb, integer) from public;
grant execute on function public.save_album_composition(uuid, text, jsonb, integer) to authenticated;

-- ── Entrar como colaborador ──────────────────────────────────────────────
--
-- O convidado não pode ler `albums` (é justamente o que ele está pedindo), então
-- não tem como inserir a própria linha em `album_editors` conferindo o token —
-- e a tabela, de propósito, **não tem política de insert**: a única porta é
-- esta função.
create or replace function public.join_album_as_editor(token uuid, joiner_name text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  found public.albums%rowtype;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into found from public.albums a
  where a.invite_token = token
    and a.invite_role = 'edit'
    and a.status = 'ready'
    and a.locked_at is null;

  if found.id is null then
    return null;
  end if;

  -- O dono não entra na própria lista: ele já pode tudo, e uma linha ali
  -- faria a tela dizer "você foi convidado para o seu álbum".
  if found.user_id = auth.uid() then
    return found.id;
  end if;

  insert into public.album_editors (album_id, user_id, editor_name)
  values (found.id, auth.uid(), left(coalesce(joiner_name, ''), 200))
  on conflict (album_id, user_id) do nothing;

  return found.id;
end $$;

revoke execute on function public.join_album_as_editor(uuid, text) from public;
grant execute on function public.join_album_as_editor(uuid, text) to authenticated;

-- ── O convite passa a dizer o papel ──────────────────────────────────────
-- `drop` antes do `create`: o tipo de retorno mudou (ganhou `role`), e
-- `create or replace` não muda assinatura de função.
drop function if exists public.album_by_invite(uuid);

create or replace function public.album_by_invite(token uuid)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  author_name text,
  role text,
  locked boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, a.title, a.author_name, a.invite_role,
         a.locked_at is not null
  from public.albums a
  where a.invite_token = token and a.status = 'ready';
$$;

revoke execute on function public.album_by_invite(uuid) from public;
grant execute on function public.album_by_invite(uuid) to anon, authenticated;

-- Álbum finalizado não recebe mais nada — nem edição, nem foto pelo convite.
-- É o mesmo `can_contribute` da A2 com a tranca acrescentada.
create or replace function public.can_contribute(album_folder text, owner_folder text)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.albums a
    where a.id = public.try_uuid(album_folder)
      and a.invite_token is not null
      and a.status = 'ready'
      and a.locked_at is null
      and a.user_id::text = owner_folder
  );
$$;

-- Colaborador lê o álbum como o dono lê — inclusive privado, que é o caso
-- normal enquanto o álbum está sendo montado.
create or replace function public.can_read_album(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.albums a
    where a.id = target
      and (
        a.user_id = auth.uid()
        or (a.is_public and a.status = 'ready')
        or exists (
          select 1 from public.album_editors e
          where e.album_id = a.id and e.user_id = auth.uid()
        )
      )
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.album_editors enable row level security;

-- Sem política de insert de propósito: entrar é por `join_album_as_editor`.
drop policy if exists "colaboradores: dono e o próprio leem" on public.album_editors;
create policy "colaboradores: dono e o próprio leem"
  on public.album_editors for select to authenticated
  using (public.owns_album(album_id) or user_id = auth.uid());

-- O dono tira quem quiser; o colaborador sai quando quiser.
drop policy if exists "colaboradores: dono remove, o próprio sai" on public.album_editors;
create policy "colaboradores: dono remove, o próprio sai"
  on public.album_editors for delete to authenticated
  using (public.owns_album(album_id) or user_id = auth.uid());

-- A linha do álbum, para quem foi convidado a editar. Só leitura: escrever é
-- por `save_album_composition`.
drop policy if exists "albums: colaborador lê" on public.albums;
create policy "albums: colaborador lê"
  on public.albums for select to authenticated
  using (public.edits_album(id));

-- As fotos: o colaborador acrescenta e tira, como o dono. O prefixo continua
-- sendo conferido — e agora contra a pasta do **dono**, que é onde as fotos
-- deste álbum moram, e não contra a de quem está gravando.
--
-- O ramo do dono é o de antes, sem a tranca, e por dois motivos: o primeiro
-- salvamento de um álbum grava fotos enquanto ele ainda é `draft` (e
-- `can_edit_album` exige `ready`), e trancar o dono no banco seria teatro —
-- ele destranca o álbum com um clique. O que a tranca garante de verdade está
-- em `save_album_composition`: com o álbum finalizado, a composição não muda
-- por caminho nenhum.
drop policy if exists "fotos: dono escreve" on public.album_photos;
create policy "fotos: dono escreve"
  on public.album_photos for insert to authenticated
  with check (
    (
      public.owns_album(album_id)
      and starts_with(storage_path, auth.uid()::text || '/' || album_id::text || '/')
    )
    or (
      public.can_edit_album(album_id)
      and starts_with(
        storage_path,
        public.album_owner(album_id)::text || '/' || album_id::text || '/'
      )
    )
  );

drop policy if exists "fotos: dono apaga" on public.album_photos;
create policy "fotos: dono apaga"
  on public.album_photos for delete to authenticated
  using (public.owns_album(album_id) or public.can_edit_album(album_id));

-- ── Storage ──────────────────────────────────────────────────────────────
-- O colaborador escreve na pasta do álbum (não na subpasta `contrib`: o que
-- ele manda **é** foto do álbum, não contribuição a aprovar), lê para montar a
-- página e apaga o que tirou do álbum.
drop policy if exists "photos: colaborador envia" on storage.objects;
create policy "photos: colaborador envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and array_length(storage.foldername(name), 1) = 2
    and public.can_edit_album_folder(
      (storage.foldername(name))[2],
      (storage.foldername(name))[1]
    )
  );

drop policy if exists "photos: colaborador lê" on storage.objects;
create policy "photos: colaborador lê"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and array_length(storage.foldername(name), 1) >= 2
    and public.edits_album(public.try_uuid((storage.foldername(name))[2]))
  );

drop policy if exists "photos: colaborador apaga" on storage.objects;
create policy "photos: colaborador apaga"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and array_length(storage.foldername(name), 1) = 2
    and public.can_edit_album_folder(
      (storage.foldername(name))[2],
      (storage.foldername(name))[1]
    )
  );
