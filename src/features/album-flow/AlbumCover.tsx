'use client';

import { useId, useLayoutEffect, useRef } from 'react';

import { useLang } from '@/features/i18n/LangProvider';

import { FLOW_COPY } from './copy';

/** O nome cabe numa linha de dado; quebra de linha só existe no desenho. */
const MAX_NAME = 40;
/** Quantas linhas o nome pode ocupar na capa. */
const MAX_LINES = 3;
/** Abaixo disso o nome deixa de ser título. */
const MIN_SIZE = 16;

/**
 * Encolhe o corpo até o texto caber em `MAX_LINES` linhas.
 *
 * Parte do corpo do CSS (que muda com a largura da tela) e desce de 1 em 1 px.
 * Mede o próprio nó — a altura do conteúdo contra a altura de três linhas —,
 * então vale igual para o `<textarea>` e para o parágrafo da capa pequena. O
 * corpo é escrito direto no nó, fora do React: muda a cada tecla.
 */
function fitText(node: HTMLElement) {
  node.style.fontSize = '';
  const style = getComputedStyle(node);
  let size = parseFloat(style.fontSize);
  const leading = parseFloat(style.lineHeight) / size || 1.02;
  const room = () => size * leading * MAX_LINES + 2;
  const used = () => {
    // O textarea tem a altura das três linhas; o que passa delas aparece no
    // `scrollHeight`. O respiro de baixo (o tracejado) não é texto.
    return node.scrollHeight - parseFloat(style.paddingBottom || '0');
  };
  while (size > MIN_SIZE && used() > room()) {
    size -= 1;
    node.style.fontSize = `${size}px`;
  }
}

/**
 * A capa do álbum, em tecido azul-noite (papel claro no modo escuro).
 *
 * Na etapa 1 o nome se escreve direto nela (`onName`): é um `<textarea>`
 * transparente, com rótulo acessível escondido, ligado em `album.name`. Na
 * etapa 2 a mesma capa aparece pequena, só para leitura — é ela que dá a
 * continuidade entre as duas telas. Nas duas o nome encolhe para caber
 * inteiro (`fitText`), em vez de ser cortado pela borda da capa.
 */
export function AlbumCover({
  name,
  onName,
  variant,
}: {
  name: string;
  onName?: (name: string) => void;
  variant: 'hero' | 'aside';
}) {
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const id = useId();
  const titleRef = useRef<HTMLTextAreaElement & HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    fitText(node);
    // A largura muda com a tela (capa menor no celular) e com a fonte chegando.
    const observer = new ResizeObserver(() => fitText(node));
    observer.observe(node.parentElement ?? node);
    return () => observer.disconnect();
  }, [name, t.coverPlaceholder]);

  return (
    <div className={`af-cover is-${variant}`}>
      {onName ? (
        <div className="af-cover-edit">
          <label htmlFor={id} className="sr-only">
            {t.coverLabel}
          </label>
          <textarea
            ref={titleRef}
            id={id}
            className="af-cover-title"
            rows={MAX_LINES}
            maxLength={MAX_NAME}
            placeholder={t.coverPlaceholder}
            value={name}
            // O nome é uma linha só (vai para a lombada e para o arquivo):
            // Enter não quebra, e quebra colada vira espaço.
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            onChange={(event) => onName(event.target.value.replace(/\s*\n\s*/g, ' '))}
            spellCheck={false}
          />
        </div>
      ) : (
        <p
          ref={titleRef}
          className="af-cover-title is-static"
          data-empty={name.trim() === ''}
        >
          {name.trim() || t.coverPlaceholder}
        </p>
      )}
    </div>
  );
}
