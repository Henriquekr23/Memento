'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { PhotoDropzone } from '@/features/photo-upload/PhotoDropzone';
import { importPhotos } from '@/features/photo-upload/importPhotos';
import type { Photo } from '@/types/photo';

import { MAX_PHOTOS_PER_SUBMISSION, type InviteTarget } from './contract';
import { sendContributions } from './sendContributions';

/**
 * A tela de quem foi convidado.
 *
 * O que ela deliberadamente **não** tem: o álbum. Nem a capa, nem as fotos que
 * já estão lá, nem quantas são. O convite dá direito de mandar, não de ver — e
 * uma tela que mostrasse o álbum transformaria o link de convite num link
 * público disfarçado, que é a coisa que o dono não pediu.
 *
 * O que ela tem é o caminho de importação da Fase 1 inteiro, sem uma linha
 * nova: arrastar arquivo, ler o EXIF no navegador, ver a data que o Memento
 * entendeu. Inclusive a parte que mais importa dizer ao convidado — o original
 * não sai da máquina dele, e o que sobe é uma cópia sem EXIF.
 */
export function ContributeForm({ target }: { target: InviteTarget }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);

  // Object URLs presos à aba: sem revogar, mandar 40 fotos e sair deixa 40
  // bitmaps na memória do navegador.
  useEffect(() => {
    return () => {
      for (const photo of photos) {
        if (photo.file) URL.revokeObjectURL(photo.previewUrl);
      }
    };
    // Só na saída: a lista muda a cada importação, e limpar a cada mudança
    // revogaria a URL de fotos que continuam na tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setBusy(true);
      try {
        const result = await importPhotos(files);
        setPhotos((current) => {
          const next = [...current, ...result.photos];
          if (next.length > MAX_PHOTOS_PER_SUBMISSION) {
            setError(
              `Dá para mandar até ${MAX_PHOTOS_PER_SUBMISSION} fotos por vez. Mandei as primeiras e você pode voltar depois com o resto.`,
            );
            return next.slice(0, MAX_PHOTOS_PER_SUBMISSION);
          }
          return next;
        });
        if (result.rejectedFileNames.length > 0) {
          setError(
            `Ignorei ${result.rejectedFileNames.length} arquivo(s) que não são imagens.`,
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  function remove(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo?.file) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  async function send() {
    setBusy(true);
    setError(null);
    setProgress({ processed: 0, total: photos.length });

    const result = await sendContributions({
      target,
      photos,
      onProgress: setProgress,
    });

    setBusy(false);
    setProgress(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    for (const photo of photos) {
      if (photo.file) URL.revokeObjectURL(photo.previewUrl);
    }
    setPhotos([]);
    setSent((current) => current + result.sent);
  }

  if (sent > 0 && photos.length === 0) {
    return (
      <section className="card mx-auto max-w-[560px] p-6 text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl">
          {sent === 1 ? 'Foto enviada' : `${sent} fotos enviadas`}
        </h1>
        <p className="muted mt-2 text-sm">
          {target.authorName || 'Quem montou o álbum'} decide agora quais entram
          em <strong>{target.title}</strong>. Você não precisa fazer mais nada.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setSent(0)}
            className="btn btn-secondary btn-sm"
          >
            Mandar mais fotos
          </button>
          <Link href="/album" className="btn btn-primary btn-sm">
            Montar um álbum meu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[720px]">
      <header>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl">
          Mande suas fotos para “{target.title}”
        </h1>
        <p className="muted mt-2 text-sm">
          {target.authorName
            ? `${target.authorName} está montando este álbum e pediu as suas fotos.`
            : 'Alguém está montando este álbum e pediu as suas fotos.'}{' '}
          Elas vão para uma caixa de entrada — quem montou escolhe o que entra.
          Você não vê nem muda o álbum por aqui.
        </p>
      </header>

      <div className="mt-6">
        <PhotoDropzone
          onFilesSelected={addFiles}
          disabled={busy}
          compact={photos.length > 0}
        />
      </div>

      {photos.length > 0 && (
        <>
          <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <li key={photo.id} className="group relative">
                <img
                  src={photo.previewUrl}
                  alt={photo.fileName}
                  className="aspect-square w-full rounded-[var(--radius-sm)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  disabled={busy}
                  aria-label={`Tirar ${photo.fileName} do envio`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-sm shadow-sm transition group-hover:opacity-100 sm:opacity-0"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="btn btn-primary"
            >
              {progress
                ? `Enviando ${progress.processed}/${progress.total}…`
                : `Enviar ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`}
            </button>
            <p className="muted text-xs">
              O arquivo original não sai do seu computador: sobe uma cópia
              reduzida, sem os metadados EXIF — inclusive sem a localização.
            </p>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--color-accent-700)]">
          {error}
        </p>
      )}
    </section>
  );
}
