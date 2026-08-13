'use client';

import type { StoryInsertion } from '@/lib/paginate';

interface StoryPageProps {
  story: StoryInsertion;
  interactive: boolean;
  onChange: (id: string, patch: Partial<Pick<StoryInsertion, 'title' | 'body'>>) => void;
}

/**
 * Página inteira de texto: para contar a história por trás das fotos.
 * Remover é papel da lixeira na tira de páginas — um só lugar para isso.
 */
export function StoryPage({ story, interactive, onChange }: StoryPageProps) {
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
        className="w-full shrink-0 select-text border-0 bg-transparent text-xl font-semibold outline-none placeholder:text-current placeholder:opacity-25"
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
        placeholder="Escreva o que aconteceu aqui…"
        aria-label="Texto da página"
        style={{ color: 'var(--paper-ink)' }}
        className="min-h-0 w-full flex-1 select-text resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-current placeholder:opacity-25"
      />

    </div>
  );
}
