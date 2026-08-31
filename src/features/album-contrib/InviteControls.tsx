'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { AlbumInviteRole } from '@/lib/supabase/types';

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
 *
 * Fase 3 · A3: o convite passou a ter **papel**. "Só mandar fotos" é o de
 * sempre; "mandar e montar" abre a bancada para quem entrar. Um papel por vez,
 * porque o álbum tem um token por vez — trocar o papel gera outro link, e o
 * anterior morre na hora. Dois links vivos com papéis diferentes pareceriam
 * mais generosos e seriam piores: revogar o de edição deixaria o de envio
 * aberto sem ninguém perceber.
 */
export function InviteControls({
  albumId,
  token: initial,
  role: initialRole,
  locked,
}: {
  albumId: string;
  /** `null` quando o convite está fechado. */
  token: string | null;
  /** Papel do convite corrente; `null` junto com o token. */
  role: AlbumInviteRole | null;
  /** Álbum finalizado: o convite continua existindo, mas não recebe mais nada. */
  locked: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initial);
  const [role, setRole] = useState<AlbumInviteRole>(initialRole ?? 'contribute');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const link = token
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/contribuir/${token}`
    : '';

  function open(wanted: AlbumInviteRole) {
    setError(null);
    startTransition(async () => {
      const result = await openInvite(albumId, wanted);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.data.token);
      setRole(result.data.role);
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
          ? role === 'edit'
            ? 'Quem abrir este link e entrar na conta monta o álbum com você: mesma bancada, mesmas fotos. Dê este link só para quem você quer de fato dentro do álbum.'
            : 'Quem abrir este link e entrar na conta pode mandar fotos para cá. Elas ficam esperando a sua aprovação — ninguém mexe no álbum além de você.'
          : 'Um link para chamar quem estava junto. Você escolhe se ele só recebe fotos — que ficam esperando a sua aprovação — ou se abre a montagem do álbum.'}
      </p>

      {/* A escolha do papel fica visível mesmo com o convite aberto: é assim
          que se troca de papel, e o texto do botão diz que isso gera outro
          link. Esconder a opção depois de criado obrigaria a encerrar o
          convite só para descobrir que ela existia.

          São dois botões inteiros, lado a lado, e não um segmentado: as duas
          opções não são graus do mesmo ajuste, são portas com consequências
          diferentes — e cada uma cabe explicar em uma linha embaixo do nome. */}
      <fieldset className="mt-5 mb-7 border-0 p-0">
        <legend className="muted mb-2.5 text-xs tracking-[0.08em] uppercase">
          O que este convite dá
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="opt-card"
            aria-pressed={role === 'contribute'}
            disabled={pending}
            onClick={() => (token ? open('contribute') : setRole('contribute'))}
          >
            <span className="opt-card-mark" aria-hidden />
            <span className="opt-card-title">Só mandar fotos</span>
            <span className="opt-card-hint">
              As fotos chegam na sua caixa de entrada e esperam você aprovar.
            </span>
          </button>
          <button
            type="button"
            className="opt-card"
            aria-pressed={role === 'edit'}
            disabled={pending}
            onClick={() => (token ? open('edit') : setRole('edit'))}
          >
            <span className="opt-card-mark" aria-hidden />
            <span className="opt-card-title">Mandar e montar</span>
            <span className="opt-card-hint">
              Abre a bancada: quem entrar monta o álbum junto com você.
            </span>
          </button>
        </div>
      </fieldset>

      {locked && (
        <p className="mt-3 text-sm text-[var(--color-accent-700)]">
          Este álbum está finalizado: o link existe, mas ninguém consegue mandar
          foto nem abrir a montagem enquanto ele não for reaberto.
        </p>
      )}

      {token ? (
        <>
          <p
            className="truncate rounded-[var(--radius-sm)] border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs"
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
              onClick={() => open(role)}
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
          onClick={() => open(role)}
          disabled={pending}
          className="btn btn-primary btn-sm"
        >
          {pending
            ? 'Criando…'
            : role === 'edit'
              ? 'Criar convite de montagem'
              : 'Criar convite de fotos'}
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
