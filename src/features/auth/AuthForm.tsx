'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { useLang } from '@/features/i18n/LangProvider';

import { signInAction, signUpAction } from './actions';
import { AUTH_COPY, type AuthCopy } from './copy';
import { EMPTY_AUTH_STATE, type AuthFormState } from './state';

export type AuthMode = 'signin' | 'signup';

/**
 * A tela /entrar, na mesma roupa da /album e das telas da conta: título grande
 * e centrado, um cartão só embaixo dele e, abaixo do cartão, a lembrança de
 * que a conta é opcional.
 *
 * Entrar e criar conta são a mesma tela com um seletor em pílula no topo do
 * cartão. Trocar não navega (a URL acompanha por `replaceState`, para o link
 * continuar valendo): o que a pessoa já digitou no e-mail não se perde, e a
 * troca é instantânea. Os campos são os mesmos — o que muda é a ação do
 * servidor e o campo de nome, que só existe no cadastro.
 */
export function AuthForm({ mode: initialMode, next }: { mode: AuthMode; next: string }) {
  const { lang } = useLang();
  const t = AUTH_COPY[lang];
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');

  function choose(nextMode: AuthMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    const url = new URL(window.location.href);
    if (nextMode === 'signup') url.searchParams.set('modo', 'criar');
    else url.searchParams.delete('modo');
    window.history.replaceState(window.history.state, '', url);
  }

  const copy = t.modes[mode];

  return (
    <section className="af-section ac-section au-section">
      <div className="af-head">
        <h1 className="lp-h af-title">{copy.title}</h1>
        <p className="af-lead au-lead">{copy.lead}</p>
      </div>

      <div className="ac-card au-card">
        <div role="tablist" aria-label={t.switchLabel} className="au-switch" data-mode={mode}>
          <span aria-hidden className="au-switch-pill" />
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className="au-switch-opt"
            onClick={() => choose('signin')}
          >
            {t.tabSignIn}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className="au-switch-opt"
            onClick={() => choose('signup')}
          >
            {t.tabSignUp}
          </button>
        </div>

        {/* `key`: cada modo tem a sua ação e o seu estado de resposta — um erro
            do login não pode aparecer no cadastro. */}
        <AuthFields
          key={mode}
          mode={mode}
          next={next}
          t={t}
          email={email}
          onEmail={setEmail}
        />
      </div>

      <div className="au-aside">
        <p className="au-aside-title">{t.noAccountTitle}</p>
        <p className="ac-hint au-aside-text">{t.noAccountText}</p>
        <Link href="/album" className="au-aside-link">
          {t.noAccountLink}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

function AuthFields({
  mode,
  next,
  t,
  email,
  onEmail,
}: {
  mode: AuthMode;
  next: string;
  t: AuthCopy;
  email: string;
  onEmail: (value: string) => void;
}) {
  const action = mode === 'signin' ? signInAction : signUpAction;
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, EMPTY_AUTH_STATE);
  const [visible, setVisible] = useState(false);
  const copy = t.modes[mode];

  return (
    <form action={formAction} className="ac-form au-form">
      <input type="hidden" name="next" value={next} />

      {/* Só no cadastro: o nome é como o sistema vai chamar a pessoa depois,
          na barra do topo e na lista de álbuns. */}
      {mode === 'signup' && (
        <div className="ac-field">
          <label htmlFor="name">{t.name}</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t.namePlaceholder}
            required
            maxLength={80}
            className="ac-input"
          />
        </div>
      )}

      <div className="ac-field">
        <label htmlFor="email">{t.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          required
          // `inputMode` e `autoCapitalize`: no celular, o teclado abre com @
          // e sem maiúscula automática — senão o e-mail sai errado e a culpa
          // parece ser do login.
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          className="ac-input"
        />
      </div>

      <div className="ac-field">
        <label htmlFor="password">{t.password}</label>
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
          className="ac-input"
        />
        {mode === 'signup' && (
          <span id="password-hint" className="ac-hint">
            {t.passwordHint}
          </span>
        )}
      </div>

      <label className="ac-check" htmlFor="show-password">
        <input
          id="show-password"
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        {t.showPassword}
      </label>

      {state.error && (
        <p role="alert" className="au-feedback is-error">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="au-feedback is-ok">
          {state.notice}
        </p>
      )}

      <SubmitButton label={copy.submit} busy={copy.busy} />
    </form>
  );
}

/** O botão sabe sozinho quando o formulário está em voo. */
function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="af-btn af-btn-primary af-btn-block">
      {pending ? busy : label}
    </button>
  );
}

/** Instalação sem Supabase: a tela explica e aponta para o álbum sem conta. */
export function AuthDisabled() {
  const { lang } = useLang();
  const t = AUTH_COPY[lang];
  return (
    <section className="af-section ac-section au-section">
      <div className="af-head">
        <h1 className="lp-h af-title">{t.disabledTitle}</h1>
      </div>
      <div className="ac-card au-card au-card-plain">
        <p className="au-aside-text">{t.disabledText}</p>
        <Link href="/album" className="af-btn af-btn-primary af-btn-block au-cta">
          {t.disabledLink}
        </Link>
      </div>
    </section>
  );
}
