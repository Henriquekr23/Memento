'use client';

import { useEffect, useRef } from 'react';

/**
 * O diário do dia: um punhado de linhas escritas pelo usuário, na página que
 * abre cada dia do álbum.
 *
 * Três decisões que valem mais que o código:
 *
 * 1. **Não é uma página de texto.** A `StoryPage` toma a folha inteira e serve
 *    para um capítulo; o diário mora *junto das fotos daquele dia*, que é onde
 *    ele quer ser lido — e é o que o fotolivro impresso faz há décadas.
 * 2. **Ele cede espaço, nunca toma.** A caixa cresce com o texto até um teto de
 *    poucas linhas e para; passando disso, o texto rola dentro dela. As fotos
 *    são o assunto da página, e um diário longo não pode espremê-las.
 * 3. **Vazio, ele desaparece.** Sem texto e sem edição (álbum público, folha
 *    virando, PDF) não sobra rastro nenhum na página; na edição, fica só um
 *    convite de uma linha, apagado, que vira campo ao receber o cursor.
 *
 * Zero geração automática: o app não escreve uma palavra aqui.
 */

/** Teto de altura, em linhas. Espelhado em `pdf/drawPage.ts`. */
export const DAY_NOTE_MAX_LINES = 5;
/** Altura da linha, em px de tela. Espelhada em `pdf/drawPage.ts`. */
export const DAY_NOTE_LINE_HEIGHT = 18;

interface DayNoteProps {
  /** Chave do grupo de dia — é ela que indexa o texto na composição. */
  groupKey: string;
  value: string;
  /** Páginas embaixo da folha que vira, e o álbum público, não editam. */
  interactive: boolean;
  onChange: (groupKey: string, text: string) => void;
}

export function DayNote({
  groupKey,
  value,
  interactive,
  onChange,
}: DayNoteProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Altura acompanhando o conteúdo, até o teto.
   *
   * O `auto` antes de medir não é supersticioso: `scrollHeight` de uma caixa
   * que já está alta devolve a altura dela, não a do texto — sem zerar
   * primeiro, o diário cresceria e nunca mais encolheria ao apagar linhas.
   */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(
      node.scrollHeight,
      DAY_NOTE_MAX_LINES * DAY_NOTE_LINE_HEIGHT,
    )}px`;
  }, [value]);

  // Sem texto e sem quem escreva: a página não perde nem um pixel com isto.
  if (!interactive && !value.trim()) return null;

  return (
    <div className="relative shrink-0 px-5 pb-1 pt-1">
      {/* Filete de acento à esquerda, como a marca de margem de um caderno. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-5 w-px"
        style={{ background: 'var(--paper-accent)', opacity: 0.45 }}
      />
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(groupKey, event.target.value)}
        // Sem isto, escrever no diário viraria arraste de folha no BookStage.
        onPointerDown={(event) => event.stopPropagation()}
        disabled={!interactive}
        rows={1}
        placeholder="Diário do dia — o que aconteceu?"
        aria-label="Diário deste dia"
        style={{
          color: 'var(--paper-ink)',
          lineHeight: `${DAY_NOTE_LINE_HEIGHT}px`,
          maxHeight: `${DAY_NOTE_MAX_LINES * DAY_NOTE_LINE_HEIGHT}px`,
        }}
        className="w-full select-text resize-none border-0 bg-transparent pl-3 text-[12px] italic opacity-80 outline-none placeholder:not-italic placeholder:text-current placeholder:opacity-30 disabled:opacity-80"
      />
    </div>
  );
}
