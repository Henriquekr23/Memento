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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          disabled={pending}
          onChange={(event) => toggle(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-accent-700)]"
        />
        Link público
      </label>

      {isPublic && (
        <button type="button" onClick={copyLink} className="btn btn-secondary btn-sm">
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      )}

      {error && (
        <span role="alert" className="text-sm text-[var(--color-accent-700)]">
          {error}
        </span>
      )}
    </div>
  );
}
