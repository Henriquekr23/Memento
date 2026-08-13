'use client';

import { useState } from 'react';

import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';

/** Onde as fotos importadas caem: montadas por data ou paradas no depósito. */
export type StartMode = 'album' | 'tray';

interface AlbumStartProps {
  name: string;
  onNameChange: (name: string) => void;
  isImporting: boolean;
  onStart: (files: File[], mode: StartMode) => void;
}

const MODES: {
  id: StartMode;
  title: string;
  description: string;
}[] = [
  {
    id: 'album',
    title: 'Organizar por data',
    description:
      'As fotos entram no álbum em ordem cronológica, um dia por página. Dá para reorganizar tudo depois.',
  },
  {
    id: 'tray',
    title: 'Eu monto',
    description:
      'As fotos ficam no depósito e você escolhe, uma a uma, o que entra em cada página.',
  },
];

/**
 * Primeira tela: dar nome ao álbum e decidir como as fotos entram.
 *
 * A escolha aparece **antes** da importação de propósito. Depois que as fotos
 * já estão montadas por data, desmontar tudo para escolher à mão é trabalho
 * perdido — e é justamente quem quer montar à mão que mais sofre com isso.
 *
 * A coluna é estreita (`max-w`) mesmo dentro de uma página larga: um formulário
 * de três campos esticado por 1200px vira uma linha de olho difícil de seguir.
 */
export function AlbumStart({
  name,
  onNameChange,
  isImporting,
  onStart,
}: AlbumStartProps) {
  const [mode, setMode] = useState<StartMode>('album');

  return (
    <section className="mx-auto w-full max-w-[680px] py-4">
      {/* Os respiros generosos são do desktop. Na tela do celular eles empurram
          o botão de escolher fotos — a única coisa que a pessoa veio fazer —
          para fora da primeira dobra. */}
      <header className="mb-7 sm:mb-12">
        <span className="kicker mb-3 sm:mb-4">Álbum novo</span>
        <h1 className="m-0 font-[family-name:var(--font-heading)] text-[clamp(26px,4.4vw,40px)] font-normal leading-[1.14] tracking-[-0.01em]">
          Todo álbum começa pelas fotos.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[24px] text-[color-mix(in_srgb,var(--color-text)_72%,transparent)] sm:mt-4 sm:text-[15.5px] sm:leading-[26px]">
          Dê um nome, escolha como as imagens entram e traga os arquivos. Um
          casamento, uma viagem, uma tarde de dez anos atrás — o que você quiser
          guardar.
        </p>
      </header>

      <div className="space-y-7 sm:space-y-11">
        <div>
          <label htmlFor="start-album-name" className="kicker mb-2.5 sm:mb-3.5">
            Nome do álbum
          </label>
          <input
            id="start-album-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ex.: Casamento da Ana, março de 2026"
            className="input input-lg placeholder:text-[color-mix(in_srgb,var(--color-text)_28%,transparent)]"
          />
        </div>

        {/* `div role="group"` e não `fieldset`: a altura do fieldset não conta
            a linha da legend, e a seção seguinte subia por cima dos cartões. */}
        <div role="group" aria-labelledby="start-mode-label">
          <span id="start-mode-label" className="kicker mb-2.5 sm:mb-3.5">
            Como montar
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {MODES.map((option) => {
              const isActive = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  aria-pressed={isActive}
                  className="mode-card"
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="mode-dot" />
                    <span className="mode-title font-[family-name:var(--font-heading)] text-[17px] font-semibold">
                      {option.title}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-[19px] text-[color-mix(in_srgb,var(--color-text)_58%,transparent)] sm:mt-2 sm:text-[13.5px] sm:leading-[21px]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="kicker mb-2.5 sm:mb-3.5">As fotos</span>
          <PhotoDropzone
            onFilesSelected={(files) => onStart(files, mode)}
            disabled={isImporting}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[color-mix(in_srgb,var(--color-text)_42%,transparent)] sm:mt-9">
        Tudo acontece no seu navegador. Nenhuma imagem é enviada a um servidor.
      </p>
    </section>
  );
}
