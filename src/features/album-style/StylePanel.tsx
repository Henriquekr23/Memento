'use client';

import {
  COVER_OPTIONS,
  FONT_OPTIONS,
  FRAME_OPTIONS,
  PAPER_OPTIONS,
  type AlbumTheme,
} from './theme';

interface StylePanelProps {
  theme: AlbumTheme;
  onChange: (patch: Partial<AlbumTheme>) => void;
  /** Inclinação automática das fotos — só faz sentido no modo espontâneo. */
  autoTiltEnabled: boolean;
  onAutoTiltChange: (enabled: boolean) => void;
  onResetPages: () => void;
  onClose: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StylePanel({
  theme,
  onChange,
  autoTiltEnabled,
  onAutoTiltChange,
  onResetPages,
  onClose,
}: StylePanelProps) {
  return (
    <div className="grid gap-5 rounded-2xl border border-white/10 bg-neutral-900/80 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
      <Section title="Capa">
        {COVER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            aria-label={`Capa ${option.label}`}
            aria-pressed={theme.cover === option.id}
            onClick={() => onChange({ cover: option.id })}
            style={option.swatch}
            className={[
              'h-9 w-9 rounded-md ring-offset-2 ring-offset-neutral-900 transition',
              theme.cover === option.id
                ? 'ring-2 ring-amber-400'
                : 'ring-1 ring-white/15 hover:ring-white/40',
            ].join(' ')}
          />
        ))}
      </Section>

      <Section title="Papel">
        {PAPER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            aria-label={`Papel ${option.label}`}
            aria-pressed={theme.paper === option.id}
            onClick={() => onChange({ paper: option.id })}
            style={option.swatch}
            className={[
              'h-9 w-9 rounded-md ring-offset-2 ring-offset-neutral-900 transition',
              theme.paper === option.id
                ? 'ring-2 ring-amber-400'
                : 'ring-1 ring-white/15 hover:ring-white/40',
            ].join(' ')}
          />
        ))}
      </Section>

      <Section title="Fotos">
        <button
          type="button"
          onClick={() => onAutoTiltChange(!autoTiltEnabled)}
          aria-pressed={autoTiltEnabled}
          title="Inclina levemente as fotos das páginas livres que você ainda não girou"
          className={[
            'rounded-full px-3 py-1.5 text-xs transition',
            autoTiltEnabled
              ? 'bg-white/90 font-medium text-neutral-900'
              : 'border border-white/15 text-white/60 hover:text-white',
          ].join(' ')}
        >
          Tortinhas
        </button>
        {FRAME_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            aria-pressed={theme.frame === option.id}
            onClick={() => onChange({ frame: option.id })}
            className={[
              'rounded-full px-3 py-1.5 text-xs transition',
              theme.frame === option.id
                ? 'bg-white/90 font-medium text-neutral-900'
                : 'border border-white/15 text-white/60 hover:text-white',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </Section>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
            Letra
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar estilos"
            className="-mt-1 rounded-full px-2 py-1 text-xs text-white/40 transition hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={theme.font === option.id}
              onClick={() => onChange({ font: option.id })}
              style={{ fontFamily: option.stack }}
              className={[
                'rounded-full px-3 py-1.5 text-xs transition',
                theme.font === option.id
                  ? 'bg-white/90 font-medium text-neutral-900'
                  : 'border border-white/15 text-white/60 hover:text-white',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetPages}
          title="Volta layouts, posições e enquadramentos ao automático (o texto fica)"
          className="mt-2 text-[11px] text-white/40 underline-offset-2 transition hover:text-white/70 hover:underline"
        >
          refazer páginas
        </button>
      </div>
    </div>
  );
}
