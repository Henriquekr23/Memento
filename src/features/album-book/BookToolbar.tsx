'use client';

import type { TurnDirection } from './usePageTurn';

interface BookToolbarProps {
  spread: number;
  spreadCount: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onTurn: (direction: TurnDirection) => void;
}

/**
 * Navegação do álbum. Fica **abaixo** do livro, como o rodapé de um livro de
 * verdade — acima dele só o que serve para abastecer as páginas.
 */
export function BookToolbar({
  spread,
  spreadCount,
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
          {spread === 0 ? 'Capa' : `${spread} de ${spreadCount - 1}`}
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
