'use client';

import type { StoryInsertion } from '@/lib/paginate';

interface StoryPageProps {
  story: StoryInsertion;
  interactive: boolean;
  onChange: (id: string, patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>) => void;
  onRemove: (id: string) => void;
}

/** Página inteira de texto: para contar a história por trás das fotos. */
export function StoryPage({
  story,
  interactive,
  onChange,
  onRemove,
}: StoryPageProps) {
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <div className="flex h-full flex-col gap-4 px-9 py-10">
      <input
        value={story.title}
        onChange={(event) => onChange(story.id, { title: event.target.value })}
        onPointerDown={stop}
        disabled={!interactive}
        placeholder="Título"
        aria-label="Título da página de texto"
        style={{ color: 'var(--paper-ink)' }}
        className="w-full shrink-0 border-0 bg-transparent text-xl font-semibold outline-none placeholder:text-current placeholder:opacity-25"
      />

      <span
        aria-hidden
        className="h-px w-14 shrink-0"
        style={{ background: 'var(--paper-accent)', opacity: 0.6 }}
      />

      <textarea
        value={story.body}
        onChange={(event) => onChange(story.id, { body: event.target.value })}
        onPointerDown={stop}
        disabled={!interactive}
        placeholder="Escreva o que aconteceu neste trecho da viagem…"
        aria-label="Texto da página"
        style={{ color: 'var(--paper-ink)' }}
        className="min-h-0 w-full flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-current placeholder:opacity-25"
      />

      {interactive && (
        <button
          type="button"
          onPointerDown={stop}
          onClick={() => onRemove(story.id)}
          className="shrink-0 self-start rounded-full px-2 py-1 text-[11px] opacity-0 transition hover:underline group-hover/page:opacity-60"
          style={{ color: 'var(--paper-ink-soft)' }}
        >
          remover esta página
        </button>
      )}
    </div>
  );
}
