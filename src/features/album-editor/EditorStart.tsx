'use client';

import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';
import { useLang } from '@/features/i18n/LangProvider';

import { EDITOR_COPY } from './copy';

interface EditorStartProps {
  name: string;
  onNameChange: (name: string) => void;
  isImporting: boolean;
  onStart: (files: File[]) => void;
}

/**
 * A tela de partida.
 *
 * Antes ela também perguntava o estilo do álbum e se as fotos entravam por data
 * ou no depósito. As duas perguntas saíram: o estilo agora se escolhe vendo a
 * capa, e a ordem por data deixou de ser opção porque virou o comportamento —
 * as fotos entram na ordem em que foram tiradas e o editor abre nelas.
 */
export function EditorStart({ name, onNameChange, isImporting, onStart }: EditorStartProps) {
  const { lang } = useLang();
  const copy = EDITOR_COPY[lang];

  return (
    <div className="card space-y-5 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{copy.emptyTitle}</h2>
        <p className="muted max-w-[52ch] text-sm">{copy.emptyBody}</p>
      </div>

      <label className="field">
        <span className="kicker">{copy.albumNameAria}</span>
        <input
          className="input"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Grécia 2026"
        />
      </label>

      <PhotoDropzone onFilesSelected={onStart} disabled={isImporting} />
    </div>
  );
}
