'use client';

import { useEffect, useRef } from 'react';

/**
 * O diário do dia: um punhado de linhas escritas pelo usuário, na página que
 * abre cada dia do álbum.
 *
 * Três decisões que valem mais que o código:
 *
 * 1. **É opcional.** A página só reserva espaço para o diário quando o usuário
 *    liga o botão ✎ na barra de edição da página. Desligado — que é o padrão —
 *    o fluxo de montar o álbum não encontra nada pelo caminho.
 * 2. **Ele cede espaço, nunca toma.** A caixa cresce com o texto até o teto de
 *    5 linhas e para de *aceitar texto* ali: o que não cabe não é digitado, em
 *    vez de virar scroll. Papel não rola — o que está na tela é o que imprime.
 * 3. **Vazio e sem edição** (álbum público, folha virando, PDF) ele não deixa
 *    rastro nenhum na página.
 *
 * Zero geração automática: o app não escreve uma palavra aqui.
 */

/** Teto de altura, em linhas. Espelhado em `pdf/drawPage.ts`. */
export const DAY_NOTE_MAX_LINES = 5;
/** Altura da linha, em px de tela. Espelhada em `pdf/drawPage.ts`. */
export const DAY_NOTE_LINE_HEIGHT = 18;

const MAX_HEIGHT = DAY_NOTE_MAX_LINES * DAY_NOTE_LINE_HEIGHT;

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
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  /**
   * O limite de 5 linhas é aplicado **antes** de aceitar o texto.
   *
   * A caixa é controlada, então no `change` o DOM já tem o texto novo: dá para
   * medir ali mesmo e, se estourou, devolver o valor anterior ao campo e não
   * propagar a mudança. É o que garante que nunca exista texto escondido atrás
   * de um scroll — que no papel simplesmente não existiria.
   */
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const node = event.currentTarget;
    const next = node.value;
    const height = node.style.height;

    node.style.height = 'auto';
    const overflows = node.scrollHeight > MAX_HEIGHT;
    node.style.height = height;

    if (overflows) {
      node.value = value;
      return;
    }
    onChange(groupKey, next);
  }

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
        onChange={handleChange}
        // Sem isto, escrever no diário viraria arraste de folha no BookStage.
        onPointerDown={(event) => event.stopPropagation()}
        disabled={!interactive}
        rows={1}
        placeholder="Diário do dia — o que aconteceu?"
        aria-label="Diário deste dia"
        style={{
          color: 'var(--paper-ink)',
          lineHeight: `${DAY_NOTE_LINE_HEIGHT}px`,
          maxHeight: `${MAX_HEIGHT}px`,
        }}
        className="w-full select-text resize-none overflow-hidden border-0 bg-transparent pl-3 text-[12px] italic opacity-80 outline-none placeholder:not-italic placeholder:text-current placeholder:opacity-30 disabled:opacity-80"
      />
    </div>
  );
}
