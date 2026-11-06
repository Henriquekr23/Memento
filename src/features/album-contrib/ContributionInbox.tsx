'use client';

/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { approveContribution, discardContribution } from './actions';
import type { PendingContribution } from './loadContributions';

/**
 * A caixa de entrada: o que chegou pelo convite e ainda não é do álbum.
 *
 * Uma decisão de produto está desenhada aqui: **não existe "aprovar tudo"**.
 * O Memento inteiro é uma aposta de que a curadoria é do usuário — é o que
 * justifica não ter IA escolhendo foto. Um botão de aprovar em bloco seria a
 * mesma renúncia com outro nome, e o dono acordaria com 80 fotos de terceiros
 * dentro do álbum sem ter olhado nenhuma.
 *
 * Aprovar coloca a foto no álbum no dia dela — a paginação agrupa por data,
 * então a foto de quarta cai na quarta, mesmo tendo chegado semanas depois.
 */
export function ContributionInbox({
  pending,
  contributorCount,
}: {
  pending: PendingContribution[];
  contributorCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Otimista: a foto sai da grade no clique. Esperar a rede para ver o
  // resultado de um "descartar" faz a tela parecer travada justamente quando o
  // usuário está num ritmo de decidir várias seguidas.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const visible = pending.filter((item) => !removed.has(item.id));

  if (pending.length === 0) return null;

  function act(id: string, action: 'approve' | 'discard') {
    setBusyId(id);
    setError(null);
    setRemoved((current) => new Set(current).add(id));

    startTransition(async () => {
      const result =
        action === 'approve'
          ? await approveContribution(id)
          : await discardContribution(id);

      setBusyId(null);
      if (!result.ok) {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (visible.length === 0) {
    return (
      <section className="ac-card ac-form-card av-card">
        <p className="ac-hint">Caixa de entrada vazia — você viu tudo que chegou.</p>
      </section>
    );
  }

  return (
    <section className="ac-card ac-form-card av-card">
      <header className="ac-card-head">
        <h2 className="ac-card-title">Chegaram pelo convite</h2>
        <p className="ac-hint">
        {visible.length} {visible.length === 1 ? 'foto esperando' : 'fotos esperando'}
        {contributorCount > 1 ? `, de ${contributorCount} pessoas` : ''}. O que
        você aprovar entra no álbum no dia em que a foto foi tirada.
        </p>
      </header>

      <ul className="av-inbox">
        {visible.map((item) => (
          <li key={item.id} className="av-inbox-item">
            {/* `img` cru, não `next/image`: a URL é assinada e expira em uma
                hora, então o otimizador do Next guardaria em cache um endereço
                que morre antes do cache. É a mesma escolha do álbum. */}
            <img
              src={item.previewUrl}
              alt={item.fileName}
              loading="lazy"
              className="av-inbox-photo"
            />
            <div className="av-inbox-body">
              <p className="av-inbox-who" title={item.contributorName}>
                {item.contributorName || 'Alguém'}
              </p>
              <p className="av-inbox-when">
                {item.takenAt
                  ? new Date(item.takenAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'sem data'}
              </p>
              <div className="av-inbox-actions">
                <button
                  type="button"
                  onClick={() => act(item.id, 'approve')}
                  disabled={busyId === item.id}
                  className="af-btn af-btn-primary af-btn-sm"
                >
                  Usar
                </button>
                <button
                  type="button"
                  onClick={() => act(item.id, 'discard')}
                  disabled={busyId === item.id}
                  className="af-btn af-btn-ghost af-btn-sm"
                  title="Apaga a foto de vez — do álbum e do servidor."
                >
                  Descartar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="ac-error av-gap">
          {error}
        </p>
      )}
    </section>
  );
}
