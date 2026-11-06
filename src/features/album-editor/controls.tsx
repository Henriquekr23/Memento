'use client';

import { useCallback, useId, useRef, useState } from 'react';

import { round } from './useDrag';

/**
 * Ponto de interrogação minimalista: a explicação mora no balão, que abre no
 * hover e no foco. O balão ocupa a largura do bloco (`.ae-group-head` e
 * `.ae-row` são `position: relative`), então nunca é cortado pela lateral.
 */
export function Help({ text }: { text: string }) {
  return (
    <span className="ae-help-wrap">
      <button type="button" className="ae-help" aria-label={text}>
        ?
      </button>
      <span className="ae-help-tip" aria-hidden>
        {text}
      </span>
    </span>
  );
}

/**
 * Bloco do inspetor, com título, ajuda opcional e ação opcional à direita.
 *
 * `collapsible`: o título vira botão e o bloco fecha e abre — a lateral da
 * capa tem muitos blocos, e quem já escolheu a cor não precisa vê-la o tempo
 * todo. Fechado, sobra só o cabeçalho; a ação da direita continua à mão.
 */
export function Group({
  title,
  help,
  right,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  title: string;
  help?: string;
  right?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Sem conteúdo (um interruptor desligado), o bloco é só o cabeçalho. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const showBody = (!collapsible || open) && children;

  return (
    <section className={`ae-group${collapsible ? ' is-collapsible' : ''}${open ? '' : ' is-closed'}`}>
      <header className="ae-group-head">
        {/* Título e "?" numa peça só, centrados entre si: soltos no cabeçalho,
            o "?" seguia a linha de base do título e caía abaixo do meio dele. */}
        <span className="ae-group-title">
          {collapsible ? (
            <button
              type="button"
              className="ae-group-toggle"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((value) => !value)}
            >
              <svg
                className="ae-group-chevron"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <h3>{title}</h3>
            </button>
          ) : (
            <h3>{title}</h3>
          )}
          {help && <Help text={help} />}
        </span>
        {right && <span className="ae-group-right">{right}</span>}
      </header>
      {showBody ? (
        <div className="ae-group-body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Linha rótulo + controle. `hint` é só a unidade ("mm", "%"); a explicação de
 * um controle vai em `help`, que vira o "?" ao lado do rótulo.
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
  help,
  stack = false,
  switchRow = false,
  children,
}: {
  label: string;
  hint?: string;
  help?: string;
  stack?: boolean;
  /** Rótulo à esquerda e o interruptor encostado à direita. */
  switchRow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`ae-row${stack ? ' is-stack' : ''}${switchRow ? ' is-switch' : ''}`}>
      <span className="ae-row-label">
        <span className="ae-row-name">
          {label}
          {help && <Help text={help} />}
        </span>
        {hint && <em>{hint}</em>}
      </span>
      <span className="ae-row-control">{children}</span>
    </div>
  );
}

/**
 * Interruptor liga/desliga. É para o que só tem dois estados e um deles é
 * "nada" (contracapa, lombada): o que ele liga aparece embaixo dele.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`ae-switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ae-switch-knob" aria-hidden />
    </button>
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
  trackRef: React.RefObject<HTMLElement | null>,
  count: number,
  index: number,
  onPick: (next: number) => void,
  /**
   * `axis: 'y'` é o trilho em pé (as visões do lado da bancada); `pad` é o
   * respiro do trilho em pixels, que tem que bater com o `padding` do CSS.
   */
  { axis = 'x', pad = 3 }: { axis?: 'x' | 'y'; pad?: number } = {},
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

  /** Trilho em pixels, no eixo do gesto. O respiro é o mesmo do CSS. */
  const geometry = useCallback(() => {
    const node = trackRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const length = axis === 'y' ? rect.height : rect.width;
    const inner = Math.max(0, length - pad * 2);
    return { left: axis === 'y' ? rect.top : rect.left, pad, inner, seg: inner / count };
  }, [axis, count, pad, trackRef]);

  const follow = useCallback(
    (pos: number) => {
      const geo = geometry();
      if (!geo) return;

      // O cursor segue o ponteiro, preso ao trilho.
      const loose = pos - geo.left - geo.pad - geo.seg / 2;
      setDrag({ x: Math.min(geo.inner - geo.seg, Math.max(0, loose)), seg: geo.seg });

      const next = Math.min(
        count - 1,
        Math.max(0, Math.floor((pos - geo.left - geo.pad) / geo.seg)),
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
    const at = (ev: { clientX: number; clientY: number }) =>
      axis === 'y' ? ev.clientY : ev.clientX;
    follow(at(event));

    const move = (ev: PointerEvent) => follow(at(ev));
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
    const forward = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    const back = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
    const step = event.key === forward ? 1 : event.key === back ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(count - 1, Math.max(0, index + step));
    lastRef.current = next;
    onPick(next);
  };

  return {
    dragging: drag !== null,
    knobStyle:
      axis === 'y'
        ? drag
          ? { height: drag.seg, transform: `translateY(${drag.x}px)` }
          : {
              height: `calc((100% - ${pad * 2}px) / ${count})`,
              transform: `translateY(${index * 100}%)`,
            }
        : drag
          ? { width: drag.seg, transform: `translateX(${drag.x}px)` }
          : {
              width: `calc((100% - ${pad * 2}px) / ${count})`,
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
