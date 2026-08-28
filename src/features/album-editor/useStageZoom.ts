'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

import { clamp } from './useDrag';

/**
 * Zoom do palco.
 *
 * O palco já se ajusta sozinho ao espaço disponível (`ppm` de encaixe); o zoom
 * é um **multiplicador** por cima disso, e não uma segunda régua. É por isso
 * que "100%" aqui quer dizer *o álbum inteiro cabendo na bancada*, e não uma
 * escala absoluta: quem abre o editor numa tela pequena e quem abre numa tela
 * grande partem do mesmo lugar.
 *
 * O gesto vem do que o navegador já manda: pinça de trackpad e roda com
 * Ctrl/⌘ chegam como `wheel` com `ctrlKey`. Roda pura continua rolando o
 * palco, que é o que ela faz em qualquer outra área que rola.
 */

const MIN = 0.5;
const MAX = 4;
const STEP = 1.25;

export interface StageZoom {
  /** Multiplicador sobre o `ppm` de encaixe. 1 = álbum inteiro visível. */
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Volta ao encaixe. */
  fit: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isFit: boolean;
}

export function useStageZoom(stageRef: RefObject<HTMLElement | null>): StageZoom {
  const [zoom, setZoom] = useState(1);

  const by = useCallback((factor: number) => {
    setZoom((current) => clamp(Math.round(current * factor * 1000) / 1000, MIN, MAX));
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => clamp(current * Math.exp(-event.deltaY / 380), MIN, MAX));
    };

    // `passive: false` porque este handler precisa de `preventDefault` — sem
    // isso o navegador aplica o zoom da página inteira por baixo do nosso.
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [stageRef]);

  return {
    zoom,
    zoomIn: useCallback(() => by(STEP), [by]),
    zoomOut: useCallback(() => by(1 / STEP), [by]),
    fit: useCallback(() => setZoom(1), []),
    canZoomIn: zoom < MAX - 0.001,
    canZoomOut: zoom > MIN + 0.001,
    isFit: Math.abs(zoom - 1) < 0.001,
  };
}
