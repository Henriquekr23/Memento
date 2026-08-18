'use client';

import { useEffect, useRef, useState } from 'react';

import { getBrowserSupabase } from '@/lib/supabase/client';

/**
 * Entrar sem sair da página.
 *
 * Por que não reusar a tela `/entrar`: o álbum montado vive na memória desta
 * aba. Qualquer navegação — inclusive um redirect de server action — o
 * destruiria, e a pessoa voltaria do login para uma tela vazia. Por isso este
 * diálogo fala com o Supabase pelo **cliente do navegador**, que grava a
 * sessão em cookie sem recarregar nada; as server actions da requisição
 * seguinte já enxergam o usuário logado.
 */

type Mode = 'signin' | 'signup';

function translate(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (lower.includes('user already registered')) {
    return 'Já existe uma conta com este e-mail. Entre em vez de criar.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme o e-mail pelo link que enviamos e tente de novo.';
  }
  if (lower.includes('password should be')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  return 'Não foi possível concluir. Tente de novo em instantes.';
}

export function InlineAuthDialog({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Chamado quando a sessão passa a existir — é a deixa para retomar o que
   *  o usuário estava fazendo (salvar o álbum). */
  onSignedIn: () => void;
}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) emailRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = getBrowserSupabase();
    const credentials = { email: email.trim(), password };

    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: { data: { full_name: name.trim().slice(0, 80) } },
          });

    setBusy(false);

    if (authError) {
      setError(translate(authError.message));
      return;
    }

    // Cadastro com confirmação de e-mail ligada não cria sessão na hora.
    if (!data.session) {
      setNotice('Conta criada. Confirme o e-mail e depois entre por aqui mesmo.');
      setMode('signin');
      return;
    }

    onSignedIn();
  }

  return (
    <div
      className="drawer-scrim fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Entrar' : 'Criar conta'}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* `.card` é transparente por padrão (ela vive sobre a página). Num
          diálogo isso deixa o conteúdo de trás aparecendo através do
          formulário — daí o fundo opaco e a sombra. */}
      <div className="panel w-full max-w-[410px] bg-[var(--color-bg)] shadow-2xl">
        <h2 className="panel-title">
          {mode === 'signin' ? 'Entrar para guardar' : 'Criar conta'}
        </h2>
        <p className="field-hint">
          Seu álbum continua montado aqui — nada se perde ao entrar.
        </p>

        <form onSubmit={submit} className="field-stack mt-5">
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="inline-name">
                Como podemos chamar você?
              </label>
              <input
                id="inline-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
                autoComplete="name"
                className="input w-full"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="inline-email">
              E-mail
            </label>
            <input
              ref={emailRef}
              id="inline-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              spellCheck={false}
              className="input w-full"
            />
          </div>

          <div className="field">
            <label htmlFor="inline-password">
              Senha
            </label>
            <input
              id="inline-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="input w-full"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-accent-700)]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <button type="submit" disabled={busy} className="btn btn-primary flex-1">
              {busy
                ? 'Um instante…'
                : mode === 'signin'
                  ? 'Entrar e guardar'
                  : 'Criar conta e guardar'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Agora não
            </button>
          </div>
        </form>

        <p className="field-hint mt-4 text-center">
          {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
          >
            {mode === 'signin' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
