'use client';

import Link from 'next/link';

import {
  IconChevronLeft,
  IconDownload,
  IconEdit,
  IconPlus,
} from '@/features/album-editor/icons';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import type { AlbumComposition } from '@/features/album-save/composition';
import { useLang } from '@/features/i18n/LangProvider';
import type { Photo } from '@/types/photo';

import { ALBUM_VIEW_COPY } from './copy';

/**
 * O alto da página de um álbum guardado: título, a linha de quem fez e
 * quando, e as ações — na roupa das etapas da `/album` (título grande e
 * centrado, botões em pílula logo abaixo).
 *
 * "Baixar PDF" é o mesmo exportador da etapa 5 (`useAlbumExport`). As fotos
 * aqui não têm `File` — vieram do Storage —, e o exportador já busca os bytes
 * pelo `previewUrl` (URL assinada) quando falta o arquivo. O PDF sai das fotos
 * guardadas (até 2000 px), não dos originais, que nunca subiram.
 *
 * O botão só é oferecido a quem monta (dono ou convidado a montar): o link
 * público é para folhear, e um PDF pronto para gráfica é outra coisa.
 */
export function AlbumHeader({
  albumId,
  title,
  authorName,
  createdAt,
  lockedAt,
  photos,
  composition,
  canEdit,
  canDownload,
  showMakeYours,
  showBack,
}: {
  albumId: string;
  title: string;
  authorName: string;
  createdAt: string;
  lockedAt: string | null;
  photos: Photo[];
  composition: AlbumComposition;
  canEdit: boolean;
  canDownload: boolean;
  showMakeYours: boolean;
  /** "← Meus álbuns": para quem monta, que chegou aqui pela lista. */
  showBack: boolean;
}) {
  const { lang } = useLang();
  const t = ALBUM_VIEW_COPY[lang];
  const { exportAlbum, isExporting, progress, error } = useAlbumExport();

  const created = new Date(createdAt).toLocaleDateString(t.locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // O nome de quem montou só aparece se a pessoa deu um: conta antiga,
  // criada antes do campo, não vira "álbum de ".
  const meta = [
    authorName ? t.byline(authorName) : null,
    t.photos(photos.length),
    t.savedOn(created),
  ]
    .filter(Boolean)
    .join(' · ');

  const hasActions = canEdit || canDownload || showMakeYours;

  return (
    <>
      {/* Sair é voltar para a lista, e o caminho fica no canto onde se procura
          por ele — não nas abas da conta, que faziam a página parecer uma
          terceira aba em vez de um álbum aberto. */}
      {showBack && (
        <div className="av-topline">
          <Link href="/albums" className="av-back">
            <IconChevronLeft size={16} />
            {t.backToAlbums}
          </Link>
        </div>
      )}
      <div className="af-head av-head">
        <h1 className="lp-h af-title">{title}</h1>
        <p className="af-lead av-meta">
          <span>{meta}</span>
          {lockedAt && <span className="ac-badge">{t.finished}</span>}
        </p>

        {hasActions && (
          <div className="av-actions">
            {/* Só para quem pode mesmo mexer, e com o álbum ainda aberto. Quem
                decide é a RLS — isto só evita oferecer o que o banco recusa. */}
            {canEdit && (
              <Link href={`/album/${albumId}/editar`} className="af-btn af-btn-primary af-btn-lg av-cta">
                <IconEdit size={17} />
                {t.edit}
              </Link>
            )}
            {canDownload && photos.length > 0 && (
              <button
                type="button"
                className="af-btn af-btn-ghost af-btn-lg"
                disabled={isExporting}
                onClick={() =>
                  void exportAlbum({ name: title, photos, album: composition.album })
                }
              >
                <IconDownload size={17} />
                {t.downloadPdf}
              </button>
            )}
            {showMakeYours && (
              <Link href="/album" className="af-btn af-btn-ghost af-btn-lg av-ghost-link">
                <IconPlus size={17} />
                {t.makeYours}
              </Link>
            )}
          </div>
        )}

        {(isExporting || error) && (
          <div className="af-build-notes">
            {isExporting && progress && (
              <p className="af-note" role="status">
                {t.exporting(progress.processed, progress.total)}
              </p>
            )}
            {error && (
              <p className="af-note is-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
