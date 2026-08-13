/**
 * Dica que aparece ao passar o mouse ou ao focar pelo teclado.
 *
 * Sem estado no React de propósito: hover e `:focus-within` já são estados que
 * o CSS conhece, e um `useState` por dica significaria re-render a cada
 * movimento do ponteiro. O desenho vive em `.tip` / `.tip-bubble`.
 *
 * No celular ela não aparece (`@media (hover: none)` no CSS): dica presa na
 * tela depois do toque é ruído, não ajuda. Por isso o rótulo **nunca** é a
 * única fonte de informação — o elemento embrulhado sempre tem texto visível
 * ou `aria-label` próprio, e a bolha é `aria-hidden` para o leitor de tela não
 * ler a mesma coisa duas vezes.
 */
export function Tooltip({
  label,
  side = 'bottom',
  children,
  className,
}: {
  label: string;
  /** De que lado da âncora a bolha nasce. */
  side?: 'top' | 'bottom';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `tip ${className}` : 'tip'} data-side={side}>
      {children}
      <span aria-hidden className="tip-bubble">
        {label}
      </span>
    </span>
  );
}
