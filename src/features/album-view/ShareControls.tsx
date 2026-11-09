'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setAlbumVisibility } from '@/features/album-save/actions';
import { ACCOUNT_COPY } from '@/features/account/copy';
import { useLang } from '@/features/i18n/LangProvider';
import { useOrigin } from '@/hooks/useOrigin';

import { CopyField } from './CopyField';

/**
 * O interruptor do link público, visível só para o dono.
 *
 * Desligado, o álbum existe só para ele. Ligado, qualquer pessoa com o
 * endereço abre — sem conta e sem cadastro. É o modelo do link de arquivo
 * compartilhado, não o de rede social: quem tem o link, entra; ninguém
 * descobre o álbum por busca (as páginas de álbum saem do índice).
 *
 * Duas roupas: `inline` (o cartão de "Meus álbuns": só o interruptor e o
 * "Copiar link") e `row` (uma linha do painel da página do álbum, com a frase
 * do que está valendo agora e o endereço à vista para copiar).
 */
export function ShareControls({
  albumId,
  isPublic: initial,
  variant = 'inline',
}: {
  albumId: string;
  isPublic: boolean;
  variant?: 'inline' | 'row';
}) {
  const router = useRouter();
  const { lang } = useLang();
  const t = ACCOUNT_COPY[lang];
  const origin = useOrigin();
  const [isPublic, setIsPublic] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const link = `${origin}/album/${albumId}`;

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
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.copyFailed);
    }
  }

  // Interruptor, e não caixa de seleção: liga e desliga uma coisa que
  // acontece agora, e é o mesmo controle das etapas de montar.
  const toggleButton = (
    <button
      type="button"
      role="switch"
      aria-checked={isPublic}
      aria-label={t.publicLink}
      disabled={pending}
      onClick={() => toggle(!isPublic)}
      className="ac-switch"
    >
      <span aria-hidden className="ac-switch-knob" />
    </button>
  );

  if (variant === 'row') {
    return (
      <div className="av-item">
        <div className="av-item-head">
          <div className="av-item-text">
            <h3 className="av-item-title">{t.publicLink}</h3>
            <p className="ac-hint">
              {isPublic
                ? t.publicOnRow
                : t.publicOffRow}
            </p>
          </div>
          {toggleButton}
        </div>
        {isPublic && (
          <CopyField
            value={link}
            label={copied ? t.copied : t.copyLink}
            copied={copied}
            disabled={pending}
            onCopy={copyLink}
          />
        )}
        {error && (
          <p role="alert" className="ac-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ac-share" data-on={isPublic || undefined}>
      <div className="ac-share-row">
        <span className="ac-share-text">
          <span className="ac-share-label">{t.publicLink}</span>
          <span className="ac-share-hint">
            {isPublic ? t.publicOnInline : t.publicOffInline}
          </span>
        </span>
        {toggleButton}
      </div>

      {isPublic && (
        <button type="button" onClick={copyLink} className="ac-copy" data-copied={copied || undefined}>
          {copied ? t.linkCopied : t.copyLink}
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
