'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SiteFooter } from '@/components/SiteFooter';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { buildShareCard } from '@/features/share/shareCard';
import { saveThankYouHandoff } from '@/features/thank-you/handoff';
import { AlbumEditor } from '@/features/album-editor/AlbumEditor';
import { IconChevronLeft, IconCloud, IconTrash } from '@/features/album-editor/icons';
import { AlbumTopBar } from '@/features/album-flow/AlbumTopBar';
import {
  chronologicalSlot,
  compactCells,
  insertAt,
  placeAt,
  syncCells,
  type Cells,
} from '@/features/album-flow/cells';
import { composeFromCells, pruneComposition } from '@/features/album-flow/compose';
import { FLOW_COPY } from '@/features/album-flow/copy';
import {
  DEFAULT_PER_PAGE,
  planSignature,
  type PerPage,
} from '@/features/album-flow/paginate';
import { StepNav, type Step } from '@/features/album-flow/StepNav';
import { StepOrder } from '@/features/album-flow/StepOrder';
import { StepStart } from '@/features/album-flow/StepStart';
import { useAlbumSave } from '@/features/album-save/useAlbumSave';
import { InlineAuthDialog } from '@/features/auth/InlineAuthDialog';
import { landingFontVars } from '@/features/landing/fonts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumSelection } from '@/features/album-builder/useAlbumSelection';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { useLang } from '@/features/i18n/LangProvider';
import type { EditorAlbum } from '@/types/album-editor';

/**
 * /album em três etapas: **1** nome e fotos, **2** confira a ordem, **3** monte
 * o álbum (o editor).
 *
 * As duas primeiras são desta página; a terceira é a bancada de sempre
 * (`AlbumEditor`), sem mudança por dentro. O acervo (`useAlbum`) é a lista
 * importada; `useAlbumSelection` diz quem foi tirado do álbum — a foto tirada
 * continua na linha do tempo, cinza, e pode voltar. O editor, o PDF e a nuvem
 * recebem só as incluídas, na ordem das páginas.
 *
 * A ponte para o editor é `composeFromOrder`: a ordem e o "fotos por página"
 * da etapa 2 viram a composição de partida. Voltar do editor para as fotos e
 * seguir de novo **não** desmancha o que foi montado — só se a ordem ou as
 * fotos mudaram, e aí a página pergunta antes.
 */
export default function AlbumPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  const album = useAlbum();
  const selection = useAlbumSelection(album.photos);
  const { exportAlbum, isExporting, progress, error } = useAlbumExport();
  const cloud = useAlbumSave();

  const [step, setStep] = useState<Step>(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  /**
   * Os quadros da etapa 2 como a pessoa deixou. Pode estar desatualizado (uma
   * foto saiu, outra chegou): `syncCells` acerta na leitura, e toda ação grava
   * a partir da versão acertada.
   */
  const [storedCells, setStoredCells] = useState<Cells | null>(null);

  /**
   * A composição corrente, espelhada aqui.
   *
   * O estado mora dentro do editor; esta cópia existe porque salvar na nuvem e
   * exportar são ações da *página*, e porque o editor sai de cena quando a
   * pessoa volta para as fotos — é daqui que ele renasce igual.
   */
  const [composition, setComposition] = useState<EditorAlbum | null>(null);
  /** Com que álbum o editor abre na próxima vez que montar. */
  const [editorSeed, setEditorSeed] = useState<EditorAlbum | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  /**
   * O plano (ordem + fotos + layout) da última vez que a composição e a etapa 2
   * concordaram. Diferente na volta para o editor = a pessoa mudou alguma coisa
   * aqui, e refazer as páginas tem de ser pergunta, não surpresa.
   */
  const [builtPlan, setBuiltPlan] = useState<string | null>(null);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const included = selection.included;
  const includedIds = useMemo(() => included.map((photo) => photo.id), [included]);
  const cells = useMemo(
    () => syncCells(storedCells, includedIds, perPage),
    [storedCells, includedIds, perPage],
  );
  const photosById = useMemo(
    () => new Map(album.photos.map((photo) => [photo.id, photo])),
    [album.photos],
  );
  const plan = planSignature(cells, perPage);
  const hasPhotos = album.photos.length > 0;
  const canBuild = included.length > 0;
  const isBuilding = step === 3 && editorSeed !== null;

  const { addFiles } = album;
  const handleFiles = useCallback((files: File[]) => void addFiles(files, 'album'), [addFiles]);

  /* ── navegação entre etapas ─────────────────────────────────────────── */

  const enterEditor = useCallback((seed: EditorAlbum) => {
    setEditorSeed(seed);
    setEditorKey((key) => key + 1);
    setStep(3);
  }, []);

  const openEditor = useCallback(() => {
    if (!canBuild) return;
    if (!composition || builtPlan === null) {
      enterEditor(composeFromCells(cells, perPage, album.name));
      setBuiltPlan(plan);
      return;
    }
    if (plan === builtPlan) {
      enterEditor(pruneComposition(composition, new Set(includedIds)));
      return;
    }
    setIsRebuildOpen(true);
  }, [album.name, builtPlan, canBuild, cells, composition, enterEditor, includedIds, perPage, plan]);

  const goTo = useCallback(
    (next: Step) => {
      if (next === 3) {
        openEditor();
        return;
      }
      // Saindo do editor: o que está montado lá corresponde ao plano de agora
      // (fotos acrescentadas pela bandeja do editor inclusive).
      if (step === 3) setBuiltPlan(plan);
      setStep(next);
    },
    [openEditor, plan, step],
  );

  // Trocar de etapa leva ao topo: o conteúdo novo começa pelo título.
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
  }, [step]);

  /* ── etapa 2: ordem e escolha ───────────────────────────────────────── */

  const { exclude, include } = selection;

  const place = useCallback(
    (id: string, cellIndex: number) => setStoredCells(placeAt(cells, id, cellIndex)),
    [cells],
  );

  /** Trocar o layout reflui as fotos na ordem dos quadros, sem os buracos. */
  const changePerPage = useCallback(
    (next: PerPage) => {
      if (next === perPage) return;
      setStoredCells(compactCells(cells));
      setPerPage(next);
    },
    [cells, perPage],
  );

  /** Na linha do tempo: tirar deixa o quadro vazio; devolver entra no tempo. */
  const toggle = useCallback(
    (id: string) => {
      if (!selection.excluded.has(id)) {
        exclude(id);
        return;
      }
      const photo = photosById.get(id);
      if (!photo) return;
      setStoredCells(insertAt(cells, chronologicalSlot(cells, photo, photosById), id));
      include(id);
    },
    [cells, exclude, include, photosById, selection.excluded],
  );

  /** "Desfazer" do X: a foto volta para o quadro de onde saiu. */
  const undoRemove = useCallback(
    (id: string, cellIndex: number) => {
      setStoredCells(insertAt(cells, cellIndex < 0 ? cells.length : cellIndex, id));
      include(id);
    },
    [cells, include],
  );

  /* ── etapa 3: exportar ──────────────────────────────────────────────── */

  /**
   * Baixar o álbum e, dando certo, ir para o agradecimento.
   *
   * A ordem importa: o cartão é desenhado **antes** da navegação, porque ele lê
   * as fotos por object URL — e object URL morre com o documento que o criou.
   * O que atravessa é o cartão já rasterizado, guardado em `sessionStorage`.
   */
  const handleExport = useCallback(
    async (current: EditorAlbum) => {
      const succeeded = await exportAlbum({
        name: album.name,
        photos: included,
        album: current,
      });

      if (!succeeded) return;

      const cardDataUrl = await buildShareCard({
        albumName: album.name,
        photoCount: included.length,
        pageCount: current.pages.length,
        previewUrls: included.slice(0, 3).map((photo) => photo.previewUrl),
        lang,
      }).catch(() => null);

      saveThankYouHandoff({
        albumName: album.name,
        photoCount: included.length,
        pageCount: current.pages.length,
        cardDataUrl,
      });

      router.push('/obrigado');
    },
    [album.name, included, exportAlbum, lang, router],
  );

  const discard = () => {
    album.clear();
    selection.reset();
    setStoredCells(null);
    setComposition(null);
    setEditorSeed(null);
    setBuiltPlan(null);
    setStep(1);
    setIsClearConfirmOpen(false);
  };

  const notes = (
    <>
      {album.status.rejectedFileNames.length > 0 && (
        <p className="af-note" role="status">
          {t.rejected(album.status.rejectedFileNames.length)}
        </p>
      )}
      {album.status.oversizedFileNames.length > 0 && (
        <p className="af-note" role="status">
          {t.oversized(album.status.oversizedFileNames.length)}
        </p>
      )}
    </>
  );

  return (
    <div className={`lp-theme af-root ${landingFontVars}`} data-step={step}>
      {/* O fundo de cada etapa: três camadas de cor sólida, e a troca é
          opacidade — nunca `background-color` animado. */}
      <div aria-hidden className="af-bg">
        <span data-tone="1" />
        <span data-tone="2" />
        <span data-tone="3" />
      </div>

      <div className="lp-remap af-chrome">
        <AlbumTopBar onSignIn={() => setIsAuthOpen(true)} />
        <StepNav
          step={step}
          isAvailable={(n) => (n === 1 ? true : n === 2 ? hasPhotos : canBuild)}
          onGo={goTo}
        />
      </div>

      {/* Entrar sem sair da página: navegar destruiria o álbum, que só existe
          na memória desta aba. Ver `InlineAuthDialog`. Serve ao "Entrar" do
          topo e ao "Salvar na nuvem" do editor. */}
      <InlineAuthDialog
        open={cloud.needsAuth || isAuthOpen}
        onClose={() => {
          if (cloud.needsAuth) cloud.cancelAuth();
          setIsAuthOpen(false);
        }}
        onSignedIn={() => {
          setIsAuthOpen(false);
          if (cloud.needsAuth) cloud.resume();
        }}
      />

      <ConfirmDialog
        open={isClearConfirmOpen}
        title={t.discardTitle}
        description={t.discardBody(album.photos.length)}
        confirmLabel={t.discardConfirm}
        cancelLabel={t.cancel}
        destructive
        onConfirm={discard}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      <ConfirmDialog
        open={isRebuildOpen}
        title={t.rebuildTitle}
        description={t.rebuildBody}
        confirmLabel={t.rebuildConfirm}
        cancelLabel={t.rebuildKeep}
        onConfirm={() => {
          setIsRebuildOpen(false);
          enterEditor(composeFromCells(cells, perPage, album.name, composition));
          setBuiltPlan(plan);
        }}
        onCancel={() => {
          setIsRebuildOpen(false);
          if (composition) enterEditor(pruneComposition(composition, new Set(includedIds)));
          setBuiltPlan(plan);
        }}
      />

      <main className="af-main">
        <div key={step} className="af-stage lp-remap">
          {step === 1 && (
            <StepStart
              name={album.name}
              onName={album.setName}
              photos={album.photos}
              isImporting={album.status.isImporting}
              progress={album.status.progress}
              onFiles={handleFiles}
              onContinue={() => goTo(2)}
              notes={notes}
            />
          )}

          {step === 2 && (
            <StepOrder
              name={album.name}
              photos={album.photos}
              photosById={photosById}
              cells={cells}
              insideCount={included.length}
              excluded={selection.excluded}
              perPage={perPage}
              onPerPage={changePerPage}
              onToggle={toggle}
              onPlace={place}
              onRemove={exclude}
              onUndoRemove={undoRemove}
              onFiles={handleFiles}
              onContinue={() => goTo(3)}
              onRestart={() => setIsClearConfirmOpen(true)}
              notes={notes}
            />
          )}

          {step === 3 && (
            <section className="af-section af-section-build">
              <h1 className="lp-h af-title">{t.buildTitle}</h1>
              <div className="af-build-notes">
                {isExporting && progress && (
                  <p className="af-note" role="status">
                    {t.exporting(progress.processed, progress.total)}
                  </p>
                )}
                {cloud.progress && (
                  <p className="af-note" role="status">
                    {t.cloudProgress(cloud.progress.processed, cloud.progress.total)}
                  </p>
                )}
                {error && (
                  <p className="af-note is-error" role="alert">
                    {error}
                  </p>
                )}
                {cloud.error && (
                  <p className="af-note is-error" role="alert">
                    {cloud.error}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {isBuilding && editorSeed && (
          // A bancada fica fora da `.lp-remap`: o editor continua lendo os
          // tokens do Organic, como antes. Só as cores dos botões principais
          // mudam (`.af-editor .ae-btn…`). Régua larga (`is-wide`): uma bancada
          // de 1054 px no meio de 1440 empurrava o inspetor para fora.
          <div className="page-shell is-wide af-editor">
            <div className="h-[calc(100dvh-140px)] min-h-[560px] overflow-hidden rounded-[16px] border border-[var(--color-divider)]">
              <AlbumEditor
                key={editorKey}
                photos={included}
                name={album.name}
                onName={album.setName}
                onUpload={(files) => album.addFiles(files, 'tray')}
                initialAlbum={editorSeed}
                onChange={setComposition}
                onExport={handleExport}
                actions={
                  <>
                    <button
                      type="button"
                      className="ae-btn af-ae-ghost"
                      aria-label={t.backToPhotosAria}
                      title={t.backToPhotosAria}
                      onClick={() => goTo(2)}
                    >
                      <IconChevronLeft size={13} />
                      <span className="ae-btn-text">{t.backToPhotos}</span>
                    </button>
                    {isSupabaseConfigured && composition && (
                      <button
                        type="button"
                        className="ae-btn af-ae-ghost"
                        aria-label={t.saveCloud}
                        title={t.saveCloud}
                        disabled={cloud.isSaving}
                        onClick={() =>
                          cloud.save({
                            title: album.name,
                            photos: included,
                            album: composition,
                          })
                        }
                      >
                        <IconCloud size={13} />
                        <span className="ae-btn-text">{cloud.isSaving ? t.saving : t.saveCloud}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="ae-btn"
                      aria-label={t.discard}
                      title={t.discard}
                      onClick={() => setIsClearConfirmOpen(true)}
                    >
                      <IconTrash size={13} />
                      <span className="ae-btn-text">{t.discard}</span>
                    </button>
                  </>
                }
              />
            </div>
          </div>
        )}
      </main>

      <div className="lp-remap af-footer">
        <div className={isBuilding ? 'page-shell is-wide' : 'af-footer-inner'}>
          <SiteFooter showMark={false} />
        </div>
      </div>

      {/* A bolha de ajuda é fixa no canto inferior direito — exatamente onde
          fica o inspetor com o editor aberto. Some enquanto a bancada está em
          uso; nas etapas 1 e 2 ela continua ali (no celular, na etapa 2, a
          barra do "Continuar" ocupa o pé da tela e ela sai, ver CSS). */}
      {!isBuilding && (
        <div className="af-faq lp-remap">
          <FaqWidget />
        </div>
      )}
    </div>
  );
}
