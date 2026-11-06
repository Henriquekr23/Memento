'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SiteFooter } from '@/components/SiteFooter';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { buildShareCard } from '@/features/share/shareCard';
import { saveThankYouHandoff } from '@/features/thank-you/handoff';
import { AlbumEditor, type BoardApi } from '@/features/album-editor/AlbumEditor';
import { AlbumTopBar } from '@/features/album-flow/AlbumTopBar';
import { composeFromOrder, pruneComposition } from '@/features/album-flow/compose';
import { FLOW_COPY } from '@/features/album-flow/copy';
import { moveNextTo, type Side } from '@/features/album-flow/order';
import { DEFAULT_PER_PAGE } from '@/features/album-flow/paginate';
import { PagesOverview } from '@/features/album-flow/PagesOverview';
import { StepFinish } from '@/features/album-flow/StepFinish';
import { StepNav, type Step } from '@/features/album-flow/StepNav';
import { StepOrder } from '@/features/album-flow/StepOrder';
import { ContinueButton, StepStart } from '@/features/album-flow/StepStart';
import { UndoToast } from '@/features/album-flow/UndoToast';
import { useAlbumSave } from '@/features/album-save/useAlbumSave';
import { InlineAuthDialog } from '@/features/auth/InlineAuthDialog';
import { landingFontVars } from '@/features/landing/fonts';
import { useAlbum } from '@/features/album-builder/useAlbum';
import { useAlbumSelection } from '@/features/album-builder/useAlbumSelection';
import { useAlbumExport } from '@/features/album-export/useAlbumExport';
import { useLang } from '@/features/i18n/LangProvider';
import type { EditorAlbum } from '@/types/album-editor';

/** As etapas que dependem da composição: páginas, capa e finalização. */
type BuildStep = 3 | 4 | 5;

/** A visão geral das páginas dentro do editor, na etapa 3. */
const renderBoard = (api: BoardApi) => <PagesOverview api={api} />;

/**
 * /album em cinco etapas: **1** nome e fotos, **2** a ordem, **3** as páginas,
 * **4** a capa e **5** finalize (ver o álbum pronto, baixar o PDF ou salvar na
 * nuvem).
 *
 * O acervo (`useAlbum`) é a lista importada e a ordem; `useAlbumSelection` diz
 * quem foi tirado do álbum — a foto tirada continua na etapa 2, apagada, e
 * pode voltar. O editor, o PDF e a nuvem recebem só as incluídas.
 *
 * A etapa 2 mexe na **ordem** (inserir). As etapas 3 e 4 são o mesmo editor
 * (`AlbumEditor`), montado uma vez e recortado por `mode`: na 3 as páginas (a
 * visão geral `PagesOverview` e a folha aberta, com o inspetor de páginas), na
 * 4 a capa e o livro. A composição nasce da ordem (`composeFromOrder`) ao
 * entrar na 3; voltar à ordem e seguir de novo **não** desmancha o que foi
 * montado — só se a ordem ou as fotos mudaram, e aí a página pergunta antes.
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
  /** O último X, para o "Desfazer". */
  const [undoId, setUndoId] = useState<string | null>(null);
  const clearUndo = useCallback(() => setUndoId(null), []);

  /**
   * A composição corrente, espelhada aqui.
   *
   * O estado mora dentro do editor; esta cópia existe porque a finalização
   * (ver, baixar, salvar) acontece com o editor fora de cena, e porque é daqui
   * que ele renasce igual quando a pessoa volta.
   */
  const [composition, setComposition] = useState<EditorAlbum | null>(null);
  /** Com que álbum o editor abre na próxima vez que montar. */
  const [editorSeed, setEditorSeed] = useState<EditorAlbum | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  /**
   * A ordem (quem está e em que sequência) da última vez que a composição e a
   * etapa 2 concordaram. Diferente na volta = a pessoa mudou a ordem, e refazer
   * as páginas tem de ser pergunta, não surpresa.
   */
  const [builtPlan, setBuiltPlan] = useState<string | null>(null);
  /** Para onde ir depois de responder "Refazer as páginas?". */
  const [rebuildTarget, setRebuildTarget] = useState<BuildStep>(3);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const included = selection.included;
  const includedIds = useMemo(() => included.map((photo) => photo.id), [included]);
  const outside = useMemo(
    () => album.photos.filter((photo) => selection.excluded.has(photo.id)),
    [album.photos, selection.excluded],
  );
  const plan = includedIds.join(',');
  const hasPhotos = album.photos.length > 0;
  const canBuild = included.length > 0;
  const isEditorStep = step === 3 || step === 4;
  const isBuilding = isEditorStep && editorSeed !== null;

  const { addFiles } = album;
  const handleFiles = useCallback((files: File[]) => void addFiles(files, 'album'), [addFiles]);

  /* ── navegação entre etapas ─────────────────────────────────────────── */

  /** Entra nas páginas, na capa ou na finalização com esta composição. */
  const enter = useCallback((next: EditorAlbum, target: BuildStep) => {
    setComposition(next);
    if (target !== 5) {
      setEditorSeed(next);
      setEditorKey((key) => key + 1);
    }
    setStep(target);
  }, []);

  const openBuild = useCallback(
    (target: BuildStep) => {
      if (!canBuild) return;
      if (!composition || builtPlan === null) {
        enter(composeFromOrder(includedIds, DEFAULT_PER_PAGE, album.name), target);
        setBuiltPlan(plan);
        return;
      }
      if (plan === builtPlan) {
        enter(pruneComposition(composition, new Set(includedIds)), target);
        return;
      }
      setRebuildTarget(target);
      setIsRebuildOpen(true);
    },
    [album.name, builtPlan, canBuild, composition, enter, includedIds, plan],
  );

  const goTo = useCallback(
    (next: Step) => {
      setUndoId(null);
      // Saindo do editor (ou trocando páginas ⇄ capa): o que está montado lá
      // corresponde à ordem de agora (fotos da bandeja do editor inclusive).
      if (isEditorStep) setBuiltPlan(plan);
      if (next === 1 || next === 2) {
        setStep(next);
        return;
      }
      // Entre páginas, capa e finalização a composição já está em dia: o
      // editor continua montado de 3 para 4, e renasce dela vindo da 5.
      if (isEditorStep && (next === 3 || next === 4)) {
        setStep(next);
        return;
      }
      if ((isEditorStep || step === 5) && composition) {
        if (next === 5) setStep(5);
        else enter(composition, next);
        return;
      }
      openBuild(next);
    },
    [composition, enter, isEditorStep, openBuild, plan, step],
  );

  // Trocar de etapa leva ao topo: o conteúdo novo começa pelo título.
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
  }, [step]);

  /* ── etapa 2: a ordem ─────────────────────────────────────────────── */

  const { exclude, include } = selection;
  const { reorderIncluded, sortByDate } = album;

  const move = useCallback(
    (id: string, targetId: string, side: Side) => {
      const ids = album.photos.map((photo) => photo.id);
      reorderIncluded(moveNextTo(ids, id, targetId, side));
    },
    [album.photos, reorderIncluded],
  );

  const backToDateOrder = useCallback(() => {
    sortByDate();
  }, [sortByDate]);

  /** O X da etapa 2: tira do álbum, com "Desfazer" (devolve no mesmo lugar). */
  const remove = useCallback(
    (id: string) => {
      exclude(id);
      setUndoId(id);
    },
    [exclude],
  );

  const toast = (
    <UndoToast
      token={undoId}
      onUndo={() => {
        if (undoId) include(undoId);
        setUndoId(null);
      }}
      onDone={clearUndo}
    />
  );

  /* ── etapa 5: baixar e salvar ───────────────────────────────────────── */

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
    setUndoId(null);
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
      {/* O fundo de cada etapa: camadas de cor sólida, e a troca é opacidade —
          nunca `background-color` animado. */}
      <div aria-hidden className="af-bg">
        <span data-tone="1" />
        <span data-tone="2" />
        <span data-tone="3" />
        <span data-tone="4" />
        <span data-tone="5" />
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
          topo e ao "Salvar na nuvem" da finalização. */}
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
          enter(composeFromOrder(includedIds, DEFAULT_PER_PAGE, album.name, composition), rebuildTarget);
          setBuiltPlan(plan);
        }}
        onCancel={() => {
          setIsRebuildOpen(false);
          if (composition) {
            enter(pruneComposition(composition, new Set(includedIds)), rebuildTarget);
          }
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
              photos={included}
              outside={outside}
              isManuallyOrdered={album.isManuallyOrdered}
              onMove={move}
              onRemove={remove}
              onRestore={include}
              onSortByDate={backToDateOrder}
              onFiles={handleFiles}
              onContinue={() => goTo(3)}
              onRestart={() => setIsClearConfirmOpen(true)}
              notes={notes}
              toast={toast}
            />
          )}

          {step === 3 && (
            <section className="af-section af-section-build">
              <h1 className="lp-h af-title">{t.pagesTitle}</h1>
            </section>
          )}

          {step === 4 && (
            <section className="af-section af-section-build">
              <h1 className="lp-h af-title">{t.coverTitle}</h1>
            </section>
          )}

          {step === 5 && composition && (
            <StepFinish
              name={album.name}
              photos={included}
              album={composition}
              isExporting={isExporting}
              exportProgress={progress}
              exportError={error}
              cloud={cloud}
              onDownload={() => void handleExport(composition)}
              onSave={() =>
                cloud.save({ title: album.name, photos: included, album: composition })
              }
              onBack={() => goTo(4)}
            />
          )}
        </div>

        {isBuilding && editorSeed && (
          // A bancada fica dentro de uma `.lp-remap` própria: lê o Organic
          // relido com a paleta da página, como o resto da /album. Régua larga
          // (`is-wide`): uma bancada de 1054 px no meio de 1440 empurrava o
          // inspetor para fora.
          <div className="page-shell is-wide af-editor lp-remap">
            <div className="af-workbench">
              <AlbumEditor
                key={editorKey}
                photos={included}
                name={album.name}
                onName={album.setName}
                onUpload={(files) => album.addFiles(files, 'tray')}
                initialAlbum={editorSeed}
                onChange={setComposition}
                mode={step === 3 ? 'pages' : 'cover'}
                renderBoard={renderBoard}
              />
            </div>
            <div className="af-build-foot">
              {step === 3 ? (
                <ContinueButton disabled={!composition} onClick={() => goTo(4)} label={t.continue} />
              ) : (
                <ContinueButton disabled={!composition} onClick={() => goTo(5)} label={t.finish} />
              )}
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
          uso; no celular, nas etapas com a barra do "Continuar", também. */}
      {!isBuilding && (
        <div className="af-faq lp-remap">
          <FaqWidget />
        </div>
      )}
    </div>
  );
}
