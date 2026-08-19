'use client';

import { useEffect, useState } from 'react';

/** Quanto tempo cada palavra fica parada na tela, em ms. */
const HOLD_MS = 2400;

/**
 * A palavra do herói que se reveza ("a viagem", "o casamento", …) — o mesmo
 * álbum serve para qualquer ocasião, e dizer isso em cinco palavras custa menos
 * que um parágrafo explicando.
 *
 * A troca é um rolo: guardamos também a palavra anterior para ela poder cair
 * enquanto a nova desce (só com a atual, a saída não teria o que animar). O
 * `tick` cresce a cada troca e serve de `key` — é o que reinicia os keyframes;
 * sem ele o elemento é o mesmo e o navegador não roda a animação de novo.
 *
 * Para leitor de tela a frase é lida uma vez só (a primeira palavra fora da
 * tela como texto estável, o rolo com `aria-hidden`): palavra trocando sozinha
 * viraria interrupção a cada 2,4s.
 */
export function RotatingWord({ words }: { words: string[] }) {
  const [{ index, previous, tick }, setState] = useState({
    index: 0,
    previous: -1,
    tick: 0,
  });

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => {
      setState((s) => ({
        index: (s.index + 1) % words.length,
        previous: s.index,
        tick: s.tick + 1,
      }));
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [words]);

  return (
    <>
      <span className="sr-only">{words[0]}</span>
      <span aria-hidden className="hero-roll">
        {previous >= 0 && (
          <span key={`out-${tick}`} className="hero-word-out">
            {words[previous % words.length]}
          </span>
        )}
        <span key={`in-${tick}`} className="hero-word">
          {words[index % words.length]}
        </span>
      </span>
    </>
  );
}
