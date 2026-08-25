'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { closeInvite, openInvite } from './actions';

/**
 * O segundo link do álbum — o de convite —, visível só para o dono.
 *
 * Vale a pena dizer em voz alta o que ele **não** é, porque a palavra
 * "compartilhar" já está gasta: o link público (`ShareControls`) deixa ver; o
 * de convite deixa **mandar**. São portas opostas, e de propósito não estão no
 * mesmo interruptor — abrir o álbum para visitas e abrir para envios são
 * decisões diferentes, tomadas em momentos diferentes.
 *
 * Quem entra por aqui não vê o álbum e não muda nada nele: as fotos param numa
 * caixa de entrada e o dono decide uma a uma.
 */
export function InviteControls({
  albumId,
  token: initial,
}: {
  albumId: string;
  /** `null` quando o convite está fechado. */
  token: string | null;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const link = token
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/contribuir/${token}`
    : '';

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await openInvite(albumId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.data);
      router.refresh();
    });
  }

  function close() {
    setError(null);
    startTransition(async () => {
      const result = await closeInvite(albumId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(null);
      router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('O navegador não deixou copiar. Selecione o link e copie à mão.');
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-[family-name:var(--font-heading)] text-lg">
        Pedir fotos para quem estava junto
      </h2>
      <p className="muted mt-1 text-sm">
        {token
          ? 'Quem abrir este link e entrar na conta pode mandar fotos para cá. Elas ficam esperando a sua aprovação — ninguém mexe no álbum além de você.'
          : 'Um link só para receber fotos de outras pessoas. Ele não mostra o álbum: quem entra por ele só manda fotos, e você decide o que entra.'}
      </p>

      {token ? (
        <>
          <p
            className="mt-4 truncate rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs"
            title={link}
          >
            {link}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={pending}
              className="btn btn-primary btn-sm"
            >
              {copied ? 'Link copiado' : 'Copiar convite'}
            </button>
            <button
              type="button"
              onClick={open}
              disabled={pending}
              className="btn btn-secondary btn-sm"
              title="Cria um link novo. O anterior para de funcionar na hora."
            >
              Gerar outro link
            </button>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="btn btn-secondary btn-sm"
              title="Fecha a porta. O que já chegou continua esperando você."
            >
              Encerrar convite
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={pending}
          className="btn btn-primary btn-sm mt-4"
        >
          {pending ? 'Criando…' : 'Criar link de convite'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-accent-700)]">
          {error}
        </p>
      )}
    </section>
  );
}
