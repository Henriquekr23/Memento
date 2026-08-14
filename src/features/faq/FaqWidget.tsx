'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { Tooltip } from '@/components/Tooltip';
import { useLang } from '@/features/i18n/LangProvider';

import { FAQ } from './copy';

/** Interrogação desenhada, para não depender de fonte de ícones. */
function QuestionIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.2 9a2.9 2.9 0 1 1 4.3 2.5c-.9.6-1.5 1.2-1.5 2.3" />
      <path d="M12 17.6h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Perguntas frequentes em um botão fixo no canto inferior direito.
 *
 * Uma pergunta aberta por vez (acordeão), porque a lista inteira aberta não
 * caberia na altura do painel e a rolagem esconderia justamente as perguntas.
 *
 * Não é `<dialog>`: o painel é um ajudante, não um bloqueio. Prender o foco e
 * escurecer a tela para ler "minhas fotos sobem para o servidor?" seria pesado
 * demais para o que ele é — mas Esc fecha, clique fora fecha, e o foco volta
 * para o botão, que é o que se espera de qualquer coisa que abre e fecha.
 *
 * No celular vira uma folha colada nas bordas (`inset-x-3`), com altura máxima
 * de 70vh e rolagem interna: painel de largura fixa estouraria a tela.
 */
export function FaqWidget() {
  const { lang } = useLang();
  const t = FAQ[lang];

  const [isOpen, setIsOpen] = useState(false);
  const [openItem, setOpenItem] = useState<number | null>(0);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc e clique fora. Os dois só existem enquanto o painel está aberto: sem
  // isso seriam dois ouvintes globais rodando em toda página, para nada.
  useEffect(() => {
    if (!isOpen) return;

    function close() {
      setIsOpen(false);
      buttonRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="faq-root">
      {isOpen && (
        <div id={panelId} role="group" aria-label={t.title} className="faq-panel">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3.5">
            <div>
              <h2 className="m-0 text-[19px] font-normal leading-6">{t.title}</h2>
              <p className="mt-1 text-[12.5px] leading-4 text-[color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label={t.closeAria}
              className="btn btn-secondary btn-icon h-8 w-8 flex-none"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="faq-list">
            {t.items.map((item, index) => {
              const isItemOpen = index === openItem;
              return (
                <div key={item.question} className="faq-item">
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isItemOpen}
                    onClick={() => setOpenItem(isItemOpen ? null : index)}
                  >
                    <span>{item.question}</span>
                    <span aria-hidden className="faq-chevron">
                      +
                    </span>
                  </button>
                  {/* Mesmo truque do "Como funciona": 0fr → 1fr anima altura
                      automática sem medir nada em JavaScript. */}
                  <span className="faq-answer">
                    <span className="block overflow-hidden">
                      <span className="block px-4 pb-3.5 text-[13.5px] leading-5 text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]">
                        {item.answer}
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--color-divider)] px-4 py-3">
            <Link
              href="/sobre"
              className="nav-link text-[13px] text-[var(--color-accent-700)]"
              onClick={() => setIsOpen(false)}
            >
              {t.moreLabel}
            </Link>
          </div>
        </div>
      )}

      <Tooltip label={t.openTip} side="top">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? t.closeAria : t.openAria}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          className="faq-fab"
        >
          {isOpen ? <CloseIcon /> : <QuestionIcon />}
        </button>
      </Tooltip>
    </div>
  );
}
