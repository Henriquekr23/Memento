'use client';

import { useEffect } from 'react';

import { StylePanel } from './StylePanel';
import type { AlbumTheme } from './theme';

interface StyleDrawerProps {
  open: boolean;
  theme: AlbumTheme;
  autoTiltEnabled: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<AlbumTheme>) => void;
  onAutoTiltChange: (enabled: boolean) => void;
  onResetPages: () => void;
}

/**
 * Gaveta de personalização, presa à borda direita da janela.
 *
 * Ficou fora do fluxo da página de propósito: aberta como painel acima do
 * livro, ela empurrava tudo para baixo — e justo quando o usuário quer ver o
 * efeito de cada escolha na página. Assim as opções ficam ao lado do álbum e
 * o livro não sai do lugar.
 *
 * Quem abre é o botão "Estilo" da barra do topo. Antes havia uma aba vertical
 * colada na borda direita da janela: ela não ocupava espaço, mas quase ninguém
 * a reconhecia como botão — texto de lado, fora de qualquer barra, longe de
 * onde o olho procura ação.
 */
export function StyleDrawer({
  open,
  theme,
  autoTiltEnabled,
  onOpenChange,
  onChange,
  onAutoTiltChange,
  onResetPages,
}: StyleDrawerProps) {
  // Esc fecha: a gaveta cobre parte da tela, e sair dela tem de ser barato.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar estilos"
          tabIndex={-1}
          onClick={() => onOpenChange(false)}
          className="drawer-scrim"
        />
      )}

      <aside
        id="style-drawer"
        data-open={open}
        aria-label="Estilo do álbum"
        className="drawer"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] px-5 py-4">
          <h2 className="m-0 font-[family-name:var(--font-heading)] text-[19px] font-semibold">
            Estilo
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar estilos"
            className="btn btn-secondary btn-icon"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <StylePanel
            theme={theme}
            onChange={onChange}
            autoTiltEnabled={autoTiltEnabled}
            onAutoTiltChange={onAutoTiltChange}
            onResetPages={onResetPages}
          />
        </div>
      </aside>
    </>
  );
}
