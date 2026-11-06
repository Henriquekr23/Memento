'use client';

import { useActionState, useId, useState } from 'react';
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
 * Os campos acompanham a digitação para responder **antes** do envio: "Salvar
 * nome" só acende quando o nome mudou, e a senha nova diz na hora se é curta
 * ou se a confirmação não bate. A validação de verdade continua no servidor
 * (`actions.ts`); isto aqui só poupa a ida e volta de um erro óbvio.
 */

const MIN_PASSWORD = 6;

function Submit({ label, busy, disabled }: { label: string; busy: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="af-btn af-btn-primary ac-btn">
      {pending ? busy : label}
    </button>
  );
}

function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="ac-feedback is-error">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="ac-feedback is-ok">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
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
  const [value, setValue] = useState(name);
  const unchanged = value.trim() === name.trim();

  return (
    <section className="ac-card ac-form-card">
      <header className="ac-card-head">
        <h2 className="ac-card-title">Seus dados</h2>
        <p className="ac-hint">
          O nome aparece no topo, na sua lista e no álbum que você compartilha.
        </p>
      </header>

      <form action={action} className="ac-form">
        <div className="ac-field">
          <label htmlFor="account-name">Nome</label>
          <input
            id="account-name"
            name="name"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            className="ac-input"
          />
        </div>

        <div className="ac-field">
          <label htmlFor="account-email">E-mail</label>
          <input
            id="account-email"
            type="email"
            value={email}
            disabled
            readOnly
            className="ac-input"
          />
          <span className="ac-hint">É o seu login. Trocar o e-mail ainda não está pronto.</span>
        </div>

        <div className="ac-form-foot">
          <Feedback state={state} />
          <Submit label="Salvar nome" busy="Salvando…" disabled={unchanged || !value.trim()} />
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
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const showId = useId();

  /* Senha trocada: os campos esvaziam. Ajuste durante a renderização (e não
     num efeito) quando a resposta muda — a resposta nova é o gatilho. */
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.notice) {
      setCurrent('');
      setNext('');
      setConfirm('');
    }
  }

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && next.length >= MIN_PASSWORD && confirm === next;
  const type = visible ? 'text' : 'password';

  return (
    <section className="ac-card ac-form-card">
      <header className="ac-card-head">
        <h2 className="ac-card-title">Senha</h2>
        <p className="ac-hint">
          A senha atual é pedida porque uma sessão esquecida aberta não pode virar uma troca
          de senha.
        </p>
      </header>

      <form action={action} className="ac-form">
        <div className="ac-field">
          <label htmlFor="current-password">Senha atual</label>
          <input
            id="current-password"
            name="currentPassword"
            type={type}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
            autoComplete="current-password"
            className="ac-input"
          />
        </div>

        {/* Lado a lado a partir de 640 px: as duas senhas são o mesmo passo e
            ler uma embaixo da outra sugere dois passos. */}
        <div className="ac-field-pair">
          <div className="ac-field">
            <label htmlFor="new-password">Senha nova</label>
            <input
              id="new-password"
              name="newPassword"
              type={type}
              value={next}
              onChange={(event) => setNext(event.target.value)}
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              aria-invalid={tooShort || undefined}
              aria-describedby="new-password-hint"
              className="ac-input"
            />
            <span id="new-password-hint" className={`ac-hint${tooShort ? ' is-warn' : ''}`}>
              {tooShort
                ? `Faltam ${MIN_PASSWORD - next.length} ${MIN_PASSWORD - next.length === 1 ? 'caractere' : 'caracteres'}.`
                : `Pelo menos ${MIN_PASSWORD} caracteres.`}
            </span>
          </div>

          <div className="ac-field">
            <label htmlFor="confirm-password">Repita a senha nova</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type={type}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              aria-invalid={mismatch || undefined}
              aria-describedby="confirm-password-hint"
              className="ac-input"
            />
            <span id="confirm-password-hint" className={`ac-hint${mismatch ? ' is-warn' : ''}`}>
              {mismatch
                ? 'Ainda não é igual à senha nova.'
                : confirm.length > 0 && confirm === next
                  ? 'As duas batem.'
                  : ' '}
            </span>
          </div>
        </div>

        <label className="ac-check" htmlFor={showId}>
          <input
            id={showId}
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
          />
          Mostrar as senhas
        </label>

        <div className="ac-form-foot">
          <Feedback state={state} />
          <Submit label="Alterar senha" busy="Alterando…" disabled={!ready} />
        </div>
      </form>
    </section>
  );
}
