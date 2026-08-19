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
  site (seção 7); o código não muda, só passa a existir um e-mail de
  confirmação.

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

A **publishable key é pública por definição** — como a do Stripe. Ela vai no
bundle do navegador e viaja no header `apikey` de toda requisição ao Supabase;
esconder do bundle não esconderia da aba Network. Ela não carrega privilégio
nenhum: identifica o projeto, não a pessoa, e tudo que passa por ela passa pela
RLS. **É a RLS que autoriza** — por isso a seção 7 existe.

A **secret key** (`sb_secret_…` / `service_role`) é a que não pode vazar: ela
**ignora a RLS**. Não é usada em lugar nenhum deste projeto — nem no servidor.
Não copie para o `.env.local`, e nunca crie variável com ela (muito menos com
prefixo `NEXT_PUBLIC_`, que a mandaria para dentro do bundle). Álbuns públicos
funcionam por política de storage, não por chave privilegiada.

## 5. No projeto, na sua máquina

```bash
npm install                        # @supabase/ssr e supabase-js já estão no package.json
cp .env.local.example .env.local   # e preencha os dois valores
npm run dev
```

`.env.local` nunca vai para o repositório (o `.gitignore` cobre `.env*`). O
modelo versionado é o `.env.local.example`, e ele é vazio de propósito.

## 6. Teste de ponta a ponta

1. `/album` → monte um álbum como sempre (sem conta: continua funcionando).
2. **Salvar na nuvem** → ele pede para entrar → **Criar conta** com um e-mail
   qualquer → volta para o álbum já logado.
3. **Salvar na nuvem** de novo → acompanha "Enviando 3/12" → vai para `/albums`.
4. Em `/albums`, ligue **Link público** e abra o link numa janela anônima:
   o álbum tem de abrir e folhear sem pedir conta.
5. Volte para `/album` (a mesma aba, sem recarregar) e **salve de novo**. Tem de
   criar um segundo álbum sem erro. Se der *duplicate key*, o esquema no painel
   ainda está com a chave primária antiga: rode `schema.sql` de novo.
6. Com uma **segunda conta**, abra `/albums`: ela não pode enxergar o álbum
   público da primeira. Se enxergar, a lista perdeu o filtro por `user_id` —
   políticas de `select` se somam com **ou**, e a RLS sozinha não faz esse
   recorte.

### Quando salvar falha

*"As fotos subiram, mas o índice do álbum falhou"* quer dizer que o Storage
aceitou os arquivos e o banco recusou a linha. `finalizeAlbum` esconde o texto
do Postgres da tela de propósito — nome de política e de coluna descrevem o
esquema para quem estiver sondando —, então o erro real fica em dois lugares:
no `console.error` do servidor (o terminal do `npm run dev`, ou os logs da
Vercel), e no script:

```bash
npm i --no-save tsx
MEMENTO_EMAIL=voce@exemplo.com MEMENTO_PASSWORD=suasenha \
  npx tsx scripts/checkSupabaseSave.mts
```

Ele entra com uma conta de verdade, refaz a sequência inteira (rascunho →
upload → índice → concluir), imprime o erro completo de qualquer passo que
falhe e apaga o álbum de teste no fim.

**Na prática, a causa quase sempre é o esquema do painel estar atrasado em
relação a `supabase/schema.sql`** — é o que o script diz em quase todos os
casos que reconhece. Os sintomas:

| Erro | O que está velho no painel |
|---|---|
| `invalid input syntax for type uuid` | `album_photos.id` ainda é `uuid`; o app manda texto |
| `duplicate key value violates unique constraint` | a chave primária ainda é só `id`, não o par (`album_id`, `id`) |
| `new row violates row-level security policy` | falta a política de insert de `album_photos` |
| `column albums.author_name does not exist` | a coluna do nome de quem compartilhou nunca foi criada |

A correção é sempre a mesma: **cole `supabase/schema.sql` inteiro no SQL
Editor e rode**. O bloco "Reconciliação" acerta tabelas de versões anteriores
sem perder álbum nenhum, e rodar de novo não custa nada.

## 7. Endurecer antes de divulgar o site

Até aqui o projeto está configurado para desenvolver. O que segue é o que muda
quando o endereço deixa de ser só seu. Está na ordem de importância.

### Autenticação

**Authentication → Sign In / Providers → Email**

1. **Confirm email**: **ligue**. Com ela desligada, qualquer pessoa cria conta
   com um e-mail que não é dela. O app já trata o caso: o cadastro não abre
   sessão na hora e aparece *"Conta criada. Confirme o e-mail…"*.
2. **SMTP próprio** (*Project Settings → Authentication → SMTP*): ligar o
   item 1 sem isto é pior do que não ligar. O SMTP embutido do Supabase é de
   desenvolvimento — poucos e-mails por hora, contados para o projeto inteiro.
   O segundo ou terceiro cadastro do dia simplesmente não recebe nada, e a
   pessoa fica com uma conta que não consegue confirmar. Resend e Brevo têm
   plano gratuito.

**Authentication → Attack Protection**

3. **Leaked password protection**: liga a checagem contra o HaveIBeenPwned no
   cadastro e na troca de senha. É a configuração de melhor retorno da lista
   inteira — senha reaproveitada de vazamento é como conta de app pequeno cai.
4. **Minimum password length**: 8. Se subir aqui, suba junto o `minLength={6}`
   de `AuthForm.tsx` e `InlineAuthDialog.tsx` — senão o navegador deixa
   enviar e o erro só aparece depois, vindo do servidor e em inglês.
5. **CAPTCHA** (Turnstile ou hCaptcha): **exige mudança de código** — o token
   precisa ir em `options.captchaToken` nas chamadas de `signUp` e
   `signInWithPassword`. Ligar no painel sem isso quebra o login. Enquanto não
   houver código, os rate limits do item 6 fazem o trabalho.

**Authentication → Rate Limits**

6. Os padrões são folgados para um álbum de viagem. Baixe *sign ups / sign ins*
   e *token refresh* para algo que caiba no uso real; o de e-mails tem de casar
   com a cota do SMTP do item 2.

**Authentication → URL Configuration**

7. **Site URL** exata (o domínio de produção) e **Redirect URLs** sem curinga
   largo: `https://SEU-DOMINIO/**` é aceitável, `https://**` transformaria o
   link de confirmação de e-mail num redirecionador aberto. Ao trocar de
   domínio, atualize os dois — esquecer quebra o login em produção sem quebrar
   nada em `localhost`.

### Banco e storage

8. **Database → Advisors → Security Advisor**: rode e zere a lista. Ele acusa
   tabela sem RLS e função `security definer` sem `search_path` fixo — os dois
   erros que o `schema.sql` já evita, e que uma tabela nova futura vai reintroduzir
   se você esquecer.
9. **Table Editor**: cadeado *RLS enabled* em `albums` e `album_photos`.
   **Toda tabela nova nasce com RLS ligada**, antes de existir a primeira linha.
10. **Storage → photos → Settings**: *Private*, limite de 10 MB por arquivo e
    apenas `image/jpeg` permitido. O `schema.sql` já grava isso; confira que
    pegou, porque um bucket criado à mão pelo painel não tem nada disso.
11. **Rode `supabase/schema.sql` de novo.** A versão atual move para dentro do
    banco três limites que antes só existiam em `album-save/actions.ts`: o
    prefixo `{usuário}/{álbum}/` do `storage_path`, o teto de 500 fotos por
    álbum e os tamanhos de título e nome de arquivo. Isso importa porque **o
    server action é evitável**: quem tem a chave publicável fala direto com o
    PostgREST e pula `finalizeAlbum` inteiro. Validação no servidor cuida do
    caminho feliz; restrição no banco cuida do resto.

### Chaves e recuperação

12. **Rotação**: *Project Settings → API keys* permite revogar e emitir uma
    publishable key nova. Não é uma emergência quando ela aparece em algum
    lugar — ela é pública. É útil quando você quer cortar um cliente antigo.
    A **secret key** é o oposto: se ela vazar, rotacione na hora, porque ela
    ignora a RLS.
13. **Não há backup automático no plano gratuito.** Se os álbuns começarem a
    importar para alguém, exporte o banco de vez em quando. E lembre que
    rollback de código é instantâneo na Vercel, mas de banco não existe: antes
    de rodar SQL que apaga coluna em produção, pense duas vezes.
14. **Recuperação de senha não existe no app ainda.** Quem esquecer a senha
    depende de você, em *Authentication → Users*.

### O que continua sendo o ponto fraco

O `finalizeAlbum` confere quem é o dono, mas a **página pública é pública de
verdade**: um link de álbum compartilhado é um segredo por obscuridade (o UUID),
sem expiração e sem senha. Desligar o link público em `/albums` revoga o acesso
na hora — as URLs das fotos são assinadas e duram uma hora, então o pior caso é
sessenta minutos de acesso residual a um link já desligado. Isso é desenho, não
descuido; só não confunda com privado.

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
