'use client';

import {
  PAGE_LAYOUTS,
  PAGE_LAYOUT_IDS,
  type ComposeMode,
  type PageLayoutId,
} from '@/types/page';

interface PageControlsProps {
  layoutId: PageLayoutId;
  onChangeLayout: (layoutId: PageLayoutId) => void;
  composeMode?: ComposeMode;
  onToggleComposeMode?: () => void;
  /**
   * Diário do dia. Só chega preenchido na página que abre o dia — nas outras a
   * pílula nem mostra o botão, porque não há diário para ligar ali.
   */
  dayNote?: { active: boolean; onToggle: () => void };
}

/** Miniatura do layout desenhada com divs — nada de ícone externo. */
function LayoutGlyph({ layoutId }: { layoutId: PageLayoutId }) {
  const cells: Record<PageLayoutId, string[]> = {
    single: ['col-span-2 row-span-2'],
    'duo-vertical': ['col-span-2', 'col-span-2'],
    'duo-horizontal': ['row-span-2', 'row-span-2'],
    trio: ['col-span-2', '', ''],
    quad: ['', '', '', ''],
  };

  return (
    <span className="grid h-4 w-3.5 grid-cols-2 grid-rows-2 gap-[1.5px]">
      {cells[layoutId].map((cell, index) => (
        <span key={index} className={`rounded-[1px] bg-current ${cell}`} />
      ))}
    </span>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-[var(--color-surface)]" />;
}

/**
 * Controles que aparecem no canto da página: qual layout, se as fotos ficam
 * encaixadas ou soltas, e se o dia tem diário.
 *
 * Tudo mora na mesma pílula branca e usa o mesmo estado de "ativo". Antes o
 * botão de modo era um pill separado, com forma e tamanho próprios, e ligá-lo
 * dava a impressão de que a interface tinha pulado.
 */
export function PageControls({
  layoutId: variant,
  onChangeLayout,
  composeMode,
  onToggleComposeMode,
  dayNote,
}: PageControlsProps) {
  const itemClass = (isActive: boolean) =>
    [
      'flex h-7 items-center justify-center rounded-full transition',
      isActive
        ? 'bg-[var(--color-surface)] text-[var(--color-accent-700)]'
        : 'text-neutral-400 hover:bg-[var(--color-surface)] hover:text-neutral-700',
    ].join(' ');

  const isFree = composeMode === 'free';

  return (
    <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface)] p-1 shadow-sm ring-1 ring-black/5 backdrop-blur">
      {!isFree && (
        <>
          {PAGE_LAYOUT_IDS.map((layoutId) => (
            <button
              key={layoutId}
              type="button"
              title={PAGE_LAYOUTS[layoutId].label}
              aria-label={PAGE_LAYOUTS[layoutId].label}
              aria-pressed={layoutId === variant}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onChangeLayout(layoutId)}
              className={`w-7 ${itemClass(layoutId === variant)}`}
            >
              <LayoutGlyph layoutId={layoutId} />
            </button>
          ))}
        </>
      )}

      {dayNote && (
        <>
          {!isFree && <Divider />}
          <button
            type="button"
            aria-pressed={dayNote.active}
            aria-label="Diário do dia"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={dayNote.onToggle}
            title={
              dayNote.active
                ? 'Diário do dia ligado — clique para tirar (o texto some)'
                : 'Escrever um diário para este dia (até 5 linhas)'
            }
            className={`w-7 text-[12px] ${itemClass(dayNote.active)}`}
          >
            ✎
          </button>
        </>
      )}

      {composeMode && onToggleComposeMode && (
        <>
          {!isFree && <Divider />}
          <button
            type="button"
            aria-pressed={isFree}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggleComposeMode}
            title={
              isFree
                ? 'Esta página está livre: arraste para mover, ◢ redimensiona, ↻ gira'
                : 'Nesta página as fotos seguem o layout — clique para soltá-las'
            }
            className={`gap-1 px-2.5 text-[11px] font-medium ${itemClass(isFree)}`}
          >
            {isFree ? '✥ livre' : '✥'}
          </button>
        </>
      )}
    </div>
  );
}
