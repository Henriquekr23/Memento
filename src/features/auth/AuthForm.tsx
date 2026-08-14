'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { signInAction, signUpAction } from './actions';
import { EMPTY_AUTH_STATE, type AuthFormState } from './state';

export type AuthMode = 'signin' | 'signup';

const COPY: Record<AuthMode, { title: string; submit: string; busy: string; swap: string; swapLabel: string }> = {
  signin: {
    title: 'Entrar',
    submit: 'Entrar',
    busy: 'Entrando…',
    swap: 'Ainda não tem conta?',
    swapLabel: 'Criar conta',
  },
  signup: {
    title: 'Criar conta',
    submit: 'Criar conta',
    busy: 'Criando…',
    swap: 'Já tem conta?',
    swapLabel: 'Entrar',
  },
};

/** O botão sabe sozinho quando o formulário está em voo. */
function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full">
      {pending ? busy : label}
    </button>
  );
}

/**
 * Um formulário só serve às duas telas: os campos são os mesmos e o que muda é
 * a ação do servidor. Duas cópias divergiriam no primeiro ajuste de estilo.
 */
export function AuthForm({ mode, next }: { mode: AuthMode; next: string }) {
  const action = mode === 'signin' ? signInAction : signUpAction;
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    action,
    EMPTY_AUTH_STATE,
  );
  const copy = COPY[mode];
  const other: AuthMode = mode === 'signin' ? 'signup' : 'signin';

  return (
    <div className="panel mx-auto w-full max-w-[430px] sm:p-8">
      <h1 className="panel-title text-2xl">{copy.title}</h1>
      <p className="field-hint">
        A conta guarda os álbuns na nuvem e gera o link para compartilhar.
        Montar e baixar o PDF continua funcionando sem ela.
      </p>

      <form action={formAction} className="field-stack mt-5">
        <input type="hidden" name="next" value={next} />

        {/* Só no cadastro: o nome é como o sistema vai chamar a pessoa depois,
            na barra do topo e na lista de álbuns. */}
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="name">
              Como podemos chamar você?
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              className="input w-full"
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            // `inputMode` e `autoCapitalize`: no celular, o teclado abre com @
            // e sem maiúscula automática — senão o e-mail sai errado e a culpa
            // parece ser do login.
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            className="input w-full"
          />
        </div>

        <div className="field">
          <label htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            className="input w-full"
          />
          {mode === 'signup' && (
            <p className="field-hint">Pelo menos 6 caracteres.</p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-[var(--color-accent-700)]">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm">
            {state.notice}
          </p>
        )}

        <SubmitButton label={copy.submit} busy={copy.busy} />
      </form>

      <p className="field-hint mt-5 text-center">
        {copy.swap}{' '}
        <Link
          href={`/entrar?modo=${other === 'signup' ? 'criar' : 'entrar'}&next=${encodeURIComponent(next)}`}
          className="nav-link"
        >
          {copy.swapLabel}
        </Link>
      </p>
    </div>
  );
}
