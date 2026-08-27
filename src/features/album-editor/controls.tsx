'use client';

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

/** Linha rótulo + controle. `hint` é a unidade ou a explicação curta. */
export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ae-row">
      <span className="ae-row-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      <span className="ae-row-control">{children}</span>
    </label>
  );
}

export interface SegOption<T> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
}

/** Segmentado: escolha exclusiva entre duas ou três opções curtas. */
export function Seg<T extends string | boolean>({
  value,
  onChange,
  options,
  full = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegOption<T>[];
  full?: boolean;
}) {
  return (
    <div className={`ae-seg${full ? ' is-full' : ''}`} role="group">
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
  return (
    <span className="ae-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {round(value, 2)}
        {unit}
      </output>
    </span>
  );
}
