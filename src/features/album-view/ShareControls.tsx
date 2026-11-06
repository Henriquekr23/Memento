'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setAlbumVisibility } from '@/features/album-save/actions';

/**
 * O interruptor do link público, visível só para o dono.
 *
 * Desligado, o álbum existe só para ele. Ligado, qualquer pessoa com o
 * endereço abre — sem conta e sem cadastro. É o modelo do link de arquivo
 * compartilhado, não o de rede social: quem tem o link, entra; ninguém
 * descobre o álbum por busca (as páginas de álbum saem do índice).
 */
export function ShareControls({
  albumId,
  isPublic: initial,
}: {
  albumId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    // Otimista: o interruptor responde na hora e volta atrás se o servidor
    // recusar. Esperar a rede para mover um toggle parece travamento.
    setIsPublic(next);
    setError(null);
    startTransition(async () => {
      const result = await setAlbumVisibility(albumId, next);
      if (!result.ok) {
        setIsPublic(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/album/${albumId}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('O navegador não deixou copiar. Copie da barra de endereços.');
    }
  }

  return (
    <div className="ac-share" data-on={isPublic || undefined}>
      <div className="ac-share-row">
        <span className="ac-share-text">
          <span className="ac-share-label">Link público</span>
          <span className="ac-share-hint">
            {isPublic ? 'Quem tiver o link abre o álbum.' : 'Só você vê este álbum.'}
          </span>
        </span>
        {/* Interruptor, e não caixa de seleção: liga e desliga uma coisa que
            acontece agora, e é o mesmo controle das etapas de montar. */}
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Link público"
          disabled={pending}
          onClick={() => toggle(!isPublic)}
          className="ac-switch"
        >
          <span aria-hidden className="ac-switch-knob" />
        </button>
      </div>

      {isPublic && (
        <button type="button" onClick={copyLink} className="ac-copy" data-copied={copied || undefined}>
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      )}

      {error && (
        <span role="alert" className="ac-error">
          {error}
        </span>
      )}
    </div>
  );
}
