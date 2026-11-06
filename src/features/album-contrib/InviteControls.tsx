'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { CopyField } from '@/features/album-view/CopyField';
import { useOrigin } from '@/hooks/useOrigin';
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

  const origin = useOrigin();
  const link = token ? `${origin}/contribuir/${token}` : '';

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

  /** Escolher o papel: com convite aberto, troca o link (o anterior morre). */
  function pick(next: AlbumInviteRole) {
    if (next === role || pending) return;
    if (token) open(next);
    else setRole(next);
  }

  return (
    <div className="av-item">
      <div className="av-item-text">
        <h3 className="av-item-title">Convidar quem estava junto</h3>
        <p className="ac-hint">
          Um link para trazer as fotos dos outros — ou para montar o álbum a várias mãos.
        </p>
      </div>

      {/* Duas portas, um link por vez: escolher a outra com o convite aberto
          gera outro endereço, e o texto embaixo diz isso. A escolha fica
          visível o tempo todo, porque é assim que se troca de papel. */}
      <div className="av-seg" role="group" aria-label="O que este convite dá">
        <button
          type="button"
          aria-pressed={role === 'contribute'}
          disabled={pending}
          onClick={() => pick('contribute')}
        >
          Só mandar fotos
        </button>
        <button
          type="button"
          aria-pressed={role === 'edit'}
          disabled={pending}
          onClick={() => pick('edit')}
        >
          Mandar e montar
        </button>
      </div>
      <p className="ac-hint">
        {role === 'edit'
          ? 'Quem entrar pelo link monta o álbum junto com você, na mesma bancada. Dê só para quem você quer de fato dentro.'
          : 'Quem entrar pelo link manda fotos. Elas esperam a sua aprovação antes de entrar no álbum.'}
        {token ? ' Trocar a opção gera outro link.' : ''}
      </p>

      {locked && (
        <p className="ac-hint is-warn">
          O álbum está finalizado: o link existe, mas ninguém manda foto nem abre a
          montagem até você reabrir.
        </p>
      )}

      {token ? (
        <>
          <CopyField
            value={link}
            label={copied ? 'Copiado' : 'Copiar convite'}
            copied={copied}
            disabled={pending}
            onCopy={copy}
          />
          <div className="av-minor">
            <button
              type="button"
              onClick={() => open(role)}
              disabled={pending}
              className="af-link"
              title="Cria um link novo. O anterior para de funcionar na hora."
            >
              Gerar outro link
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="af-link"
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
          className="af-btn af-btn-primary af-btn-sm av-item-cta"
        >
          {pending ? 'Criando…' : 'Criar link de convite'}
        </button>
      )}

      {error && (
        <p role="alert" className="ac-error">
          {error}
        </p>
      )}
    </div>
  );
}
