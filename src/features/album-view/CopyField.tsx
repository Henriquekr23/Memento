'use client';

import { IconCheck } from '@/features/album-editor/icons';

/**
 * Um endereço à vista com o botão de copiar colado nele.
 *
 * O endereço aparece inteiro (cortado com reticências, nunca escondido): quem
 * vai mandar o link para alguém quer conferir o que está mandando. Clicar no
 * texto seleciona tudo, para quem prefere copiar à mão.
 */
export function CopyField({
  value,
  label,
  copied,
  disabled,
  onCopy,
}: {
  value: string;
  label: string;
  copied: boolean;
  disabled?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="av-copy" data-copied={copied || undefined}>
      <input
        className="av-copy-text"
        readOnly
        value={value}
        aria-label="Endereço"
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        className="af-btn af-btn-primary af-btn-sm av-copy-btn"
        disabled={disabled}
        onClick={onCopy}
      >
        {copied && <IconCheck size={15} />}
        {label}
      </button>
    </div>
  );
}
