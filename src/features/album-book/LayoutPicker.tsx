'use client';

import { PAGE_LAYOUTS, PAGE_LAYOUT_IDS, type PageLayoutId } from '@/types/page';

interface LayoutPickerProps {
  value: PageLayoutId;
  onChange: (layoutId: PageLayoutId) => void;
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

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur">
      {PAGE_LAYOUT_IDS.map((layoutId) => {
        const isActive = layoutId === value;
        return (
          <button
            key={layoutId}
            type="button"
            title={PAGE_LAYOUTS[layoutId].label}
            aria-label={PAGE_LAYOUTS[layoutId].label}
            aria-pressed={isActive}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onChange(layoutId)}
            className={[
              'rounded-full p-1.5 transition',
              isActive
                ? 'bg-neutral-900 text-amber-300'
                : 'text-neutral-400 hover:bg-neutral-900/10 hover:text-neutral-700',
            ].join(' ')}
          >
            <LayoutGlyph layoutId={layoutId} />
          </button>
        );
      })}
    </div>
  );
}
