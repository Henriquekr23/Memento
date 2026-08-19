/**
 * Diagnóstico do "salvar na nuvem" (Fase 2).
 *
 * Existe porque `finalizeAlbum` esconde o texto do Postgres de propósito: a
 * tela mostra "As fotos subiram, mas o índice do álbum falhou", e a causa real
 * (nome de política, de coluna, de restrição) fica só no `console.error` do
 * servidor. Este script refaz exatamente a mesma sequência — rascunho, upload,
 * insert do índice — falando direto com o PostgREST, e **imprime o erro
 * inteiro**.
 *
 * Fora do `tsconfig` do app, como os outros scripts. Roda com:
 *   npm i --no-save tsx
 *   MEMENTO_EMAIL=voce@exemplo.com MEMENTO_PASSWORD=suasenha \
 *     npx tsx scripts/checkSupabaseSave.mts
 *
 * Usa a chave publicável do `.env.local` e entra com uma conta de verdade —
 * é o mesmo par (chave pública + sessão) que o navegador usa, então a RLS
 * responde igual. O álbum de teste é apagado no fim.
 */

import { readFileSync } from 'node:fs';

import { createClient, type PostgrestError } from '@supabase/supabase-js';

// ── Configuração ─────────────────────────────────────────────────────────

/** `.env.local` não é carregado fora do Next; lemos o arquivo à mão. */
function readEnvLocal(): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnvLocal(), ...process.env };

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const email = env.MEMENTO_EMAIL ?? '';
const password = env.MEMENTO_PASSWORD ?? '';

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}
if (!email || !password) {
  console.error(
    'Informe a conta de teste:\n' +
      '  MEMENTO_EMAIL=... MEMENTO_PASSWORD=... npx tsx scripts/checkSupabaseSave.mts',
  );
  process.exit(1);
}

// ── Saída ────────────────────────────────────────────────────────────────

let failures = 0;

function ok(label: string, extra = '') {
  console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ''}`);
}

function fail(label: string, error: unknown) {
  failures += 1;
  console.log(`  ✗ ${label}`);
  const e = error as Partial<PostgrestError> & { status?: number; name?: string };
  if (e?.code) console.log(`      code:    ${e.code}`);
  if (e?.status) console.log(`      status:  ${e.status}`);
  if (e?.message) console.log(`      message: ${e.message}`);
  if (e?.details) console.log(`      details: ${e.details}`);
  if (e?.hint) console.log(`      hint:    ${e.hint}`);
  console.log(`      ${diagnose(e)}`);
}

/**
 * Traduz o erro do Postgres para "o que fazer no painel". São exatamente as
 * armadilhas que `supabase/CHECKLIST.md` descreve — o script só as reconhece
 * pelo código do erro em vez de esperar alguém lembrar.
 */
function diagnose(e: { code?: string; message?: string }): string {
  const message = e.message ?? '';
  switch (e.code) {
    case '42501':
      return 'RLS recusou a linha. A política de insert de `album_photos` não existe ou está desatualizada → rode `supabase/schema.sql` inteiro no SQL Editor.';
    case '23505':
      return 'Chave duplicada. A chave primária ainda é só `id`, e não o par (`album_id`, `id`) → rode `supabase/schema.sql` inteiro.';
    case '22P02':
      return 'A coluna `id` de `album_photos` ainda é `uuid`; o app gera ids de texto → rode `supabase/schema.sql` inteiro.';
    case '23514':
      return 'Uma `check constraint` recusou o valor (tamanho, `position`, `timestamp_source`). Veja `message` acima.';
    case '23503':
      return 'Chave estrangeira: o álbum não existe mais (ou o `album_id` não bate).';
    case '42P01':
      return 'Tabela inexistente → o `schema.sql` nunca foi rodado neste projeto.';
    case '42703':
      return 'Coluna inexistente → o esquema no painel é mais antigo que o `schema.sql` do repositório.';
    case 'PGRST204':
      return 'O cache de esquema do PostgREST não conhece essa coluna → rode `schema.sql` e, se persistir, `notify pgrst, \'reload schema\';`.';
    default:
      if (/row-level security/i.test(message)) {
        return 'RLS recusou a operação → rode `supabase/schema.sql` inteiro.';
      }
      return 'Sem tradução conhecida — o texto acima é o que `finalizeAlbum` esconde da tela.';
  }
}

// ── O teste ──────────────────────────────────────────────────────────────

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nProjeto: ${url}\n`);

console.log('1. Sessão');
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (authError || !auth.user) {
  fail('entrar na conta', authError);
  console.log('\nSem sessão não dá para testar o resto.\n');
  process.exit(1);
}
const userId = auth.user.id;
ok('entrar na conta', userId);

console.log('\n2. Rascunho do álbum (o que `createAlbumDraft` faz)');
const { data: album, error: draftError } = await supabase
  .from('albums')
  .insert({ user_id: userId, title: 'Diagnóstico — pode apagar', status: 'draft' })
  .select('id')
  .single();

if (draftError || !album) {
  fail('criar o rascunho', draftError);
  process.exit(1);
}
const albumId = album.id as string;
ok('criar o rascunho', albumId);

// A partir daqui tudo é limpeza garantida: o álbum de teste não pode ficar.
try {
  const photoId = `photo_diag_${Date.now().toString(36)}`;
  const storagePath = `${userId}/${albumId}/${photoId}.jpg`;

  console.log('\n3. Upload de uma foto (Storage)');
  // Um JPEG mínimo de verdade: o bucket só aceita `image/jpeg`.
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(0x08),
    0xff, 0xd9,
  ]);
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, jpeg, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) fail('subir o arquivo', uploadError);
  else ok('subir o arquivo', storagePath);

  console.log('\n4. Índice do álbum — é aqui que a tela falha');
  const row = {
    id: photoId,
    album_id: albumId,
    position: 0,
    storage_path: storagePath,
    file_name: 'diagnostico.jpg',
    width: 1200,
    height: 800,
    taken_at: new Date().toISOString(),
    timestamp_source: 'file' as const,
  };
  const { error: photoError } = await supabase.from('album_photos').insert([row]);
  if (photoError) fail('inserir a linha em `album_photos`', photoError);
  else ok('inserir a linha em `album_photos`');

  console.log('\n5. Concluir o álbum (o `update` de `albums`)');
  const { error: finishError } = await supabase
    .from('albums')
    .update({
      title: 'Diagnóstico — pode apagar',
      author_name: 'Diagnóstico',
      composition: { version: 1 },
      photo_count: 1,
      status: 'ready',
    })
    .eq('id', albumId)
    .eq('user_id', userId);
  if (finishError) fail('concluir o álbum', finishError);
  else ok('concluir o álbum');
} finally {
  console.log('\n6. Limpeza');
  const { data: files } = await supabase.storage
    .from('photos')
    .list(`${userId}/${albumId}`, { limit: 100 });
  if (files?.length) {
    await supabase.storage
      .from('photos')
      .remove(files.map((file) => `${userId}/${albumId}/${file.name}`));
  }
  const { error: cleanupError } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
    .eq('user_id', userId);
  if (cleanupError) fail('apagar o álbum de teste', cleanupError);
  else ok('álbum de teste apagado');
}

console.log(
  failures === 0
    ? '\nTudo passou. O esquema no painel está de acordo com `supabase/schema.sql`.\n'
    : `\n${failures} passo(s) falharam — veja a linha de diagnóstico de cada um.\n`,
);
process.exit(failures === 0 ? 0 : 1);
