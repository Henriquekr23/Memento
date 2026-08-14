'use client';

import { useCallback, useMemo, useState } from 'react';

import { Tooltip } from '@/components/Tooltip';
import { useLang } from '@/features/i18n/LangProvider';

import { dataUrlToBlob } from './shareCard';
import {
  buildShareTextWithUrl,
  shareCardFileName,
  type ShareFacts,
} from './shareMessage';
import { buildShareTargets, nativeShareLabel, shareNatively } from './shareTargets';

const COPY = {
  pt: {
    kicker: 'Compartilhar',
    intro: 'O texto abaixo já vai montado. Nenhuma foto é enviada — só a mensagem.',
    copy: 'Copiar o texto',
    copied: 'Texto copiado',
    tipTarget: (label: string) => `Abrir o ${label} com o texto pronto`,
    tipCopy: 'Copiar a mensagem para colar onde quiser',
    tipNative: 'Usar o compartilhamento do aparelho',
  },
  en: {
    kicker: 'Share',
    intro: 'The text below comes ready. No photo is sent — only the message.',
    copy: 'Copy the text',
    copied: 'Text copied',
    tipTarget: (label: string) => `Open ${label} with the text ready`,
    tipCopy: 'Copy the message to paste anywhere',
    tipNative: 'Use your device sharing sheet',
  },
} as const;

/**
 * Os botões de compartilhar, com a mensagem já montada.
 *
 * Recebe os fatos do álbum (nome, contagens) e o cartão como data URL — não a
 * foto nem o arquivo do álbum. Assim o mesmo componente serve a página de
 * agradecimento hoje e, na Fase 2, uma tela de álbum publicado, sem saber de
 * onde os números vieram.
 */
export function ShareRow({
  albumName,
  photoCount,
  pageCount,
  cardDataUrl,
}: {
  albumName: string;
  photoCount: number;
  pageCount: number;
  cardDataUrl: string | null;
}) {
  const { lang } = useLang();
  const t = COPY[lang];

  const facts: ShareFacts = useMemo(
    () => ({ albumName, photoCount, pageCount, lang }),
    [albumName, photoCount, pageCount, lang],
  );

  const targets = useMemo(() => buildShareTargets(facts), [facts]);
  const message = useMemo(() => buildShareTextWithUrl(facts), [facts]);

  const [isCopied, setIsCopied] = useState(false);

  const copyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2200);
    } catch {
      /* Sem permissão de área de transferência: o texto está visível abaixo. */
    }
  }, [message]);

  const shareNative = useCallback(async () => {
    const card = cardDataUrl ? dataUrlToBlob(cardDataUrl) : null;
    await shareNatively(facts, card, shareCardFileName(albumName));
  }, [albumName, cardDataUrl, facts]);

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <section>
      <span className="kicker mb-3">{t.kicker}</span>
      <p className="max-w-[56ch] text-[14.5px] leading-6 text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]">
        {t.intro}
      </p>

      {/* `flex-wrap` + alvos de 36px: no celular os botões quebram em duas
          linhas em vez de encolher abaixo do tamanho do dedo. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {targets.map((target) => (
          <Tooltip key={target.id} label={t.tipTarget(target.label)} side="top">
            <a
              href={target.href}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-secondary"
            >
              {target.label}
            </a>
          </Tooltip>
        ))}

        <Tooltip label={t.tipCopy} side="top">
          <button type="button" onClick={copyMessage} className="btn btn-secondary">
            {isCopied ? t.copied : t.copy}
          </button>
        </Tooltip>

        {hasNativeShare && (
          <Tooltip label={t.tipNative} side="top">
            <button type="button" onClick={shareNative} className="btn btn-primary">
              {nativeShareLabel(lang)}
            </button>
          </Tooltip>
        )}
      </div>

      {/* A mensagem à vista: quem não quiser clicar em nada copia com o dedo, e
          quem for clicar sabe de antemão o que vai ser publicado. */}
      <p className="mt-5 max-w-[62ch] whitespace-pre-line rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-text)_3%,transparent)] p-4 text-[14px] leading-6 text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]">
        {message}
      </p>
    </section>
  );
}
