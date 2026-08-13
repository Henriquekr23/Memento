'use client';

import type { TurnDirection } from './usePageTurn';

interface BookToolbarProps {
  /** Onde o leitor está: "Capa", "3 de 8"… quem escreve é o álbum, que sabe
      se a tela mostra um spread ou uma página só. */
  label: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  onTurn: (direction: TurnDirection) => void;
}

/**
 * Navegação do álbum. Fica **abaixo** do livro, como o rodapé de um livro de
 * verdade — acima dele só o que serve para abastecer as páginas.
 */
export function BookToolbar({
  label,
  canGoNext,
  canGoPrev,
  onTurn,
}: BookToolbarProps) {
  return (
    <div className="flex justify-center">
      {/* Setas e contador num corpo só: três controles soltos lado a lado não
          diziam que faziam parte da mesma coisa. */}
      <div className="pager">
        <button
          type="button"
          onClick={() => onTurn('prev')}
          disabled={!canGoPrev}
          aria-label="Página anterior"
          className="pager-btn"
        >
          ‹
        </button>
        <span className="pager-label" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onTurn('next')}
          disabled={!canGoNext}
          aria-label="Próxima página"
          className="pager-btn"
        >
          ›
        </button>
      </div>
    </div>
  );
}
