'use client';

import type { EditorCopy } from './copy';
import { IconMinus, IconPlus } from './icons';
import type { StageZoom } from './useStageZoom';

/**
 * Os três controles de escala, na mesma pílula do resto da bancada.
 *
 * A leitura da escala *é* o botão de voltar ao encaixe: um número inerte ao
 * lado de dois botões seria um controle a menos disfarçado de rótulo.
 */
export function ZoomControls({ zoom, copy }: { zoom: StageZoom; copy: EditorCopy }) {
  return (
    <div className="ae-zoom" role="group" aria-label={copy.zoomGroup}>
      <button
        type="button"
        aria-label={copy.zoomOut}
        title={copy.zoomOut}
        disabled={!zoom.canZoomOut}
        onClick={zoom.zoomOut}
      >
        <IconMinus size={14} />
      </button>
      <button
        type="button"
        className="ae-zoom-level"
        aria-label={copy.zoomFit}
        title={copy.zoomFit}
        disabled={zoom.isFit}
        onClick={zoom.fit}
      >
        {Math.round(zoom.zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label={copy.zoomIn}
        title={copy.zoomIn}
        disabled={!zoom.canZoomIn}
        onClick={zoom.zoomIn}
      >
        <IconPlus size={14} />
      </button>
    </div>
  );
}
