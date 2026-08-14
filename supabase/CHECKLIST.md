# Fase 2 — o que fazer no painel do Supabase

Dez minutos, tudo no free tier, sem cartão de crédito.

## 1. Criar o projeto

1. <https://supabase.com> → **Start your project** → entrar com o GitHub.
2. **New project**. Nome: `memento`. Região: **South America (São Paulo)** —
   é o que dá menos latência daqui.
3. Guarde a senha do banco que ele gera (não é usada pelo app, mas some da tela).
4. Espere terminar de provisionar (~2 min).

## 2. Rodar o esquema

**SQL Editor** → **New query** → cole o conteúdo de `supabase/schema.sql`
inteiro → **Run**.

**Rode de novo sempre que o arquivo mudar.** Ele é idempotente, e o bloco
"Reconciliação" no meio acerta tabelas criadas por versões anteriores —
`create table if not exists` sozinho não altera nada numa tabela que já
existe, e é assim que um erro do tipo *"invalid input syntax for type uuid"*
aparece só na hora de salvar.

Isso cria as tabelas `albums` e `album_photos`, liga RLS nas duas, cria o
bucket privado `photos` e as políticas de storage. Pode rodar de novo sem medo.

Confira em **Table Editor**: as duas tabelas aparecem com o cadeado
"RLS enabled". Em **Storage**, o bucket `photos` aparece como *Private*.

## 3. Autenticação

**Authentication → Sign In / Providers**:

- **Email** deve estar ligado (é o padrão). Nenhum provedor social é usado.
- **Confirm email**: deixe **desligado** por enquanto — assim dá para criar
  conta e entrar direto durante o desenvolvimento. Ligue antes de divulgar o
  site; o código não muda, só passa a existir um e-mail de confirmação.

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` agora; troque para o domínio da Vercel
  quando publicar.
- **Redirect URLs**: acrescente `http://localhost:3000/**` e, depois,
  `https://SEU-DOMINIO.vercel.app/**`.

## 4. Pegar as chaves

**Project Settings → API keys**. Copie:

| Painel | Vai para |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

A **secret key** (`sb_secret_…` / `service_role`) **não é usada em lugar
nenhum** deste projeto — nem no servidor. Não copie para o `.env.local`. Álbuns
públicos funcionam por política de storage, não por chave privilegiada.

## 5. No projeto, na sua máquina

```bash
npm install @supabase/ssr @supabase/supabase-js
cp .env.local.example .env.local   # e preencha os dois valores
npm run dev
```

## 6. Teste de ponta a ponta

1. `/album` → monte um álbum como sempre (sem conta: continua funcionando).
2. **Salvar na nuvem** → ele pede para entrar → **Criar conta** com um e-mail
   qualquer → volta para o álbum já logado.
3. **Salvar na nuvem** de novo → acompanha "Enviando 3/12" → vai para `/albums`.
4. Em `/albums`, ligue **Link público** e abra o link numa janela anônima:
   o álbum tem de abrir e folhear sem pedir conta.

## Limites do free tier — o que monitorar

| Recurso | Free tier | O que gasta |
|---|---|---|
| Storage | 1 GB | ~300 KB por foto salva (redimensionada) ≈ 3.000 fotos |
| Egress | 5 GB/mês | cada visita a um álbum público baixa as fotos dele |
| Banco | 500 MB | as linhas são minúsculas; não é o gargalo |
| Projeto pausado | 7 dias sem requisição | qualquer visita reativa; só demora uns segundos |

O que estoura primeiro é o **egress**, não o storage: um álbum de 40 fotos
(~12 MB) aguenta ~400 visitas por mês. Se passar disso, o caminho gratuito é
pôr o Cloudflare na frente ou migrar o bucket para o R2 (10 GB, egress zero) —
só o `storage_path` muda de significado, o resto do código fica igual.
