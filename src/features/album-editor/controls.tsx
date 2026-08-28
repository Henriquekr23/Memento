'use client';

import { useCallback, useRef, useState } from 'react';

import { round } from './useDrag';

/** Bloco do inspetor, com título e ação opcional à direita. */
export function Group({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ae-group">
      <header className="ae-group-head">
        <h3>{title}</h3>
        {right}
      </header>
      <div className="ae-group-body">{children}</div>
    </section>
  );
}

/**
 * Linha rótulo + controle. `hint` é a unidade ou a explicação curta.
 *
 * É uma `div`, e não uma `label`: dentro de uma `label` o clique em qualquer
 * lugar da linha é redirecionado para o primeiro controle rotulável, o que
 * atrapalha um segmentado de dois botões. Cada controle carrega o próprio
 * `aria-label`.
 *
 * `stack` põe o controle embaixo do rótulo — é o que dá largura inteira a um
 * segmentado ou a um deslizante numa lateral de 264 px.
 */
export function Row({
  label,
  hint,
  stack = false,
  children,
}: {
  label: string;
  hint?: string;
  stack?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`ae-row${stack ? ' is-stack' : ''}`}>
      <span className="ae-row-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      <span className="ae-row-control">{children}</span>
    </div>
  );
}

export interface SegOption<T> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
}

export interface TrackDrag {
  dragging: boolean;
  /** Estilo do cursor: em pixels durante o gesto, em casas no repouso. */
  knobStyle: React.CSSProperties;
  onPointerDown: (event: React.PointerEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * O gesto de um controle de casas: segurar e arrastar entre elas.
 *
 * O cursor gruda no ponteiro e anda em **pixels**, em vez de pular de casa em
 * casa — sem isso o controle parece dois ou quatro botões colados e pede mira.
 * Ao soltar, ele assenta na casa mais próxima com a curva do repouso. O clique
 * direto numa casa continua funcionando: quem clica sem arrastar já cai na
 * primeira leitura do `pointerdown`.
 *
 * Vive fora do `Seg` porque as abas do álbum (capa · páginas · livro · grade)
 * são o mesmo gesto num trilho maior. O respiro de 3 px é o mesmo no CSS dos
 * dois (`.ae-seg`, `.ae-tabs`).
 */
export function useTrackDrag(
  /**
   * O nó do trilho é criado por quem chama, e não devolvido daqui: uma
   * referência que sai de um hook dentro de um objeto lido na renderização é
   * exatamente o que a regra `react-hooks/refs` proíbe — e com razão, porque
   * ninguém sabe dizer, olhando a chamada, que aquele campo não é um valor.
   */
  trackRef: React.RefObject<HTMLDivElement | null>,
  count: number,
  index: number,
  onPick: (next: number) => void,
): TrackDrag {
  /**
   * Cursor durante o gesto: posição e largura em pixels, medidas no
   * `pointerdown` e atualizadas no `pointermove`. Guardadas em estado, e não
   * lidas do DOM na renderização — medir durante o render é o que faz um
   * controle assim ficar um quadro atrás do dedo.
   */
  const [drag, setDrag] = useState<{ x: number; seg: number } | null>(null);
  // Última casa entregue neste gesto: evita disparar `onPick` a cada pixel.
  const lastRef = useRef(index);

  /** Trilho em pixels. O respiro de 3 px é o mesmo do CSS. */
  const geometry = useCallback(() => {
    const node = trackRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const pad = 3;
    const inner = Math.max(0, rect.width - pad * 2);
    return { left: rect.left, pad, inner, seg: inner / count };
  }, [count, trackRef]);

  const follow = useCallback(
    (clientX: number) => {
      const geo = geometry();
      if (!geo) return;

      // O cursor segue o ponteiro, preso ao trilho.
      const loose = clientX - geo.left - geo.pad - geo.seg / 2;
      setDrag({ x: Math.min(geo.inner - geo.seg, Math.max(0, loose)), seg: geo.seg });

      const next = Math.min(
        count - 1,
        Math.max(0, Math.floor((clientX - geo.left - geo.pad) / geo.seg)),
      );
      if (next === lastRef.current) return;
      lastRef.current = next;
      onPick(next);
    },
    [count, geometry, onPick],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    lastRef.current = index;
    follow(event.clientX);

    const move = (ev: PointerEvent) => follow(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(count - 1, Math.max(0, index + step));
    lastRef.current = next;
    onPick(next);
  };

  return {
    dragging: drag !== null,
    knobStyle: drag
      ? { width: drag.seg, transform: `translateX(${drag.x}px)` }
      : {
          width: `calc((100% - 6px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        },
    onPointerDown,
    onKeyDown,
  };
}

/**
 * Segmentado: escolha exclusiva entre duas ou três opções curtas.
 *
 * Ele é um **interruptor de verdade** — ver `useTrackDrag`.
 */
export function Seg<T extends string | boolean>({
  value,
  onChange,
  options,
  full = false,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegOption<T>[];
  full?: boolean;
  /** Nome acessível do grupo — a `Row` não rotula mais por envolvimento. */
  label?: string;
}) {
  const count = options.length;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const pick = useCallback(
    (next: number) => onChange(options[next].value),
    [onChange, options],
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const track = useTrackDrag(trackRef, count, index, pick);

  return (
    <div
      ref={trackRef}
      className={`ae-seg${full ? ' is-full' : ''}${track.dragging ? ' is-dragging' : ''}`}
      role="group"
      aria-label={label}
      onPointerDown={track.onPointerDown}
      onKeyDown={track.onKeyDown}
    >
      <span className="ae-seg-knob" aria-hidden style={track.knobStyle} />
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          className={value === option.value ? 'is-on' : ''}
          onClick={() => onChange(option.value)}
          title={option.title ?? option.label}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}

/** Deslizante com leitura numérica ao lado — numerais tabulares, não dança. */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
}) {
  const filled = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <span className="ae-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ '--ae-fill': `${filled}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {round(value, 2)}
        {unit}
      </output>
    </span>
  );
}
