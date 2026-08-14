'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { updateNameAction, updatePasswordAction } from './actions';
import { EMPTY_AUTH_STATE, type AuthFormState } from './state';

/**
 * Os dois formulários da tela de conta.
 *
 * Separados de propósito: são duas intenções e dois riscos diferentes. Num
 * formulário só, quem quisesse corrigir o nome teria de digitar a senha atual
 * junto — e um erro na senha jogaria fora a correção do nome.
 *
 * O espaçamento vem das classes do design system (`.field`, `.field-stack`,
 * `.panel`), não de `space-y-*` escolhido caso a caso: era isso que deixava o
 * rótulo colado no campo numa tela e solto na outra.
 */

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? busy : label}
    </button>
  );
}

/** Ocupa altura mesmo vazio: sem isso o botão pula quando a resposta chega. */
function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-[var(--color-accent-700)]">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="text-sm text-[var(--color-accent-700)]">
        {state.notice}
      </p>
    );
  }
  return null;
}

export function NameForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(
    updateNameAction,
    EMPTY_AUTH_STATE,
  );

  return (
    <section className="panel">
      <h2 className="panel-title">Seus dados</h2>
      <p className="field-hint max-w-[58ch]">
        O nome aparece na barra do topo, na sua lista e no álbum que você
        compartilha. O e-mail é o login e não muda por aqui.
      </p>

      <form action={action} className="field-stack mt-4">
        <div className="field field-width">
          <label htmlFor="account-name">Nome</label>
          <input
            id="account-name"
            name="name"
            type="text"
            defaultValue={name}
            required
            maxLength={80}
            autoComplete="name"
            className="input"
          />
        </div>

        <div className="field field-width">
          <label htmlFor="account-email">E-mail</label>
          <input
            id="account-email"
            type="email"
            value={email}
            disabled
            readOnly
            className="input opacity-55"
          />
          <span className="field-hint">Trocar o e-mail ainda não está pronto.</span>
        </div>

        <div className="panel-actions">
          <Submit label="Salvar nome" busy="Salvando…" />
          <Feedback state={state} />
        </div>
      </form>
    </section>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(
    updatePasswordAction,
    EMPTY_AUTH_STATE,
  );

  return (
    <section className="panel">
      <h2 className="panel-title">Senha</h2>
      <p className="field-hint max-w-[58ch]">
        A senha atual é pedida porque uma sessão esquecida aberta não pode virar
        uma troca de senha.
      </p>

      <form action={action} className="field-stack mt-4">
        <div className="field field-width">
          <label htmlFor="current-password">Senha atual</label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>

        {/* Duas colunas a partir de sm: as duas senhas são o mesmo passo e
            ler uma embaixo da outra sugere dois passos. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="new-password">Senha nova</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
            <span className="field-hint">Pelo menos 6 caracteres.</span>
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Repita a senha nova</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
          </div>
        </div>

        <div className="panel-actions">
          <Submit label="Alterar senha" busy="Alterando…" />
          <Feedback state={state} />
        </div>
      </form>
    </section>
  );
}
