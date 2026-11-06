'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SiteFooter } from '@/components/SiteFooter';
import { FaqWidget } from '@/features/faq/FaqWidget';
import { buildShareCard } from '@/features/share/shareCard';
import { saveThankYouHandoff } from '@/features/thank-you/handoff';
import { AlbumEditor, type BoardApi } from '@/features/album-editor/AlbumEditor';
import { AlbumTopBar } from '@/features/album-flow/AlbumTopBar';
import { useAlbumEditSave } from '@/features/album-edit/useAlbumEditSave';
import type { StoredPhoto } from '@/features/album-edit/plan';
import {
  composeFromGroups,
  groupsFromComposition,
  pruneComposition,
} from '@/features/album-flow/compose';
import { FLOW_COPY } from '@/features/album-flow/copy';
import {
  chunk,
  flatten,
  groupsKey,
  mergeOrder,
  moveToGroup,
  regroup,
  sortedIds,
  syncGroups,
  type PageGroups,
  type SortMode,
} from '@/features/album-flow/pageGroups';
import { PagesOverview } from '@/features/album-flow/PagesOverview';
import { StepFinish, type FinishSave } from '@/features/album-flow/StepFinish';
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
import { colorOf, DEFAULT_COLOR } from '@/features/album-editor/palette';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { EditorAlbum } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

/** As etapas que dependem da composição: páginas, capa e finalização. */
type BuildStep = 3 | 4 | 5;

/** A visão geral das páginas dentro do editor, na etapa 3. */
const renderBoard = (api: BoardApi) => <PagesOverview api={api} />;

/**
 * Um álbum que já está na nuvem, reaberto no fluxo (`/album/[id]/editar`).
 *
 * As fotos chegam com URL assinada no `previewUrl` — o editor não sabe a
 * diferença —, e a composição guardada é a partida das etapas 3 a 5.
 */
export interface AlbumFlowEdit {
  albumId: string;
  /** Dono do álbum: a pasta do bucket, mesmo quando quem edita é convidado. */
  ownerId: string;
  isOwner: boolean;
  title: string;
  photos: Photo[];
  stored: StoredPhoto[];
  composition: EditorAlbum;
}

/** O estado de partida de um álbum guardado: a divisão lida das páginas. */
function seedFromEdit(edit: AlbumFlowEdit) {
  const groups = groupsFromComposition(edit.composition);
  const ids = edit.photos.map((photo) => photo.id);
  return {
    groups,
    // Calculado do mesmo jeito que `plan` é calculado no render: se a pessoa
    // não mexer na ordem, os dois batem e ninguém pergunta "Refazer?".
    plan: groupsKey(syncGroups(groups, ids)),
  };
}

/**
 * O fluxo da /album em cinco etapas: **1** nome e fotos, **2** a ordem, **3** as páginas,
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
 * 4 a capa e o livro. A etapa 2 já divide a ordem em páginas (`pageGroups`),
 * e a composição nasce dessa divisão (`composeFromGroups`) ao
 * entrar na 3; voltar à ordem e seguir de novo **não** desmancha o que foi
 * montado — só se a ordem ou as fotos mudaram, e aí a página pergunta antes.
 */
export function AlbumFlow({ edit }: { edit?: AlbumFlowEdit } = {}) {
  const router = useRouter();
  const { lang } = useLang();
  const t = FLOW_COPY[lang];
  // Reabrindo um álbum guardado, o acervo já nasce cheio e "ordenado à mão".
  const album = useAlbum(edit ? { name: edit.title, photos: edit.photos } : undefined);
  const [seed] = useState(() => (edit ? seedFromEdit(edit) : null));
  const selection = useAlbumSelection(album.photos);
  const { exportAlbum, isExporting, progress, error } = useAlbumExport();
  const cloud = useAlbumSave();
  const editSave = useAlbumEditSave();

  // Reabrir um álbum guardado leva direto às páginas: a pessoa voltou para
  // mexer em alguma coisa, não para escolher as fotos de novo.
  const [step, setStep] = useState<Step>(edit ? 3 : 1);
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
  const [composition, setComposition] = useState<EditorAlbum | null>(
    edit?.composition ?? null,
  );
  /** Com que álbum o editor abre na próxima vez que montar. */
  const [editorSeed, setEditorSeed] = useState<EditorAlbum | null>(
    edit?.composition ?? null,
  );
  const [editorKey, setEditorKey] = useState(0);
  /**
   * A ordem (quem está e em que sequência) da última vez que a composição e a
   * etapa 2 concordaram. Diferente na volta = a pessoa mudou a ordem, e refazer
   * as páginas tem de ser pergunta, não surpresa.
   */
  const [builtPlan, setBuiltPlan] = useState<string | null>(seed?.plan ?? null);
  /** Para onde ir depois de responder "Refazer as páginas?". */
  const [rebuildTarget, setRebuildTarget] = useState<BuildStep>(3);

  /**
   * A divisão em páginas da etapa 2. `null` até a pessoa mexer: aí vale a
   * partida (duas fotos por página, na ordem do acervo).
   */
  const [groupsState, setGroupsState] = useState<PageGroups | null>(seed?.groups ?? null);
  /**
   * A ordenação escolhida no canto da etapa 2. Mexer à mão vira `custom` — e
   * um álbum guardado já começa assim: a divisão dele foi feita por alguém.
   */
  const [sortMode, setSortMode] = useState<SortMode>(edit ? 'custom' : 'date');
  /** A última divisão feita à mão — "Personalizado" volta para ela. */
  const [customGroups, setCustomGroups] = useState<PageGroups | null>(seed?.groups ?? null);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const included = selection.included;
  const includedIds = useMemo(() => included.map((photo) => photo.id), [included]);
  const outside = useMemo(
    () => album.photos.filter((photo) => selection.excluded.has(photo.id)),
    [album.photos, selection.excluded],
  );
  const groups = useMemo(
    () => syncGroups(groupsState ?? chunk(includedIds), includedIds),
    [groupsState, includedIds],
  );
  // A ordem e a divisão: se qualquer uma mudar, as páginas montadas deixam de
  // corresponder à etapa 2.
  const plan = groupsKey(groups);
  const hasPhotos = album.photos.length > 0;
  /** A cor do álbum para a capa da etapa 1: a escolhida, ou a padrão. */
  const coverColor = colorOf(composition ?? { color: DEFAULT_COLOR });
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
        enter(composeFromGroups(groups, album.name), target);
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
    [album.name, builtPlan, canBuild, composition, enter, groups, includedIds, plan],
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
  const { reorderIncluded } = album;

  /** A divisão nova vale para a etapa 2 e vira a ordem do acervo. */
  const applyGroups = useCallback(
    (next: PageGroups) => {
      setGroupsState(next);
      reorderIncluded(
        mergeOrder(
          album.photos.map((photo) => photo.id),
          selection.excluded,
          flatten(next),
        ),
      );
    },
    [album.photos, reorderIncluded, selection.excluded],
  );

  const moveTo = useCallback(
    (id: string, group: number, index: number) => {
      const next = moveToGroup(groups, id, group, index);
      if (!next) return;
      applyGroups(next);
      setSortMode('custom');
      setCustomGroups(next);
    },
    [applyGroups, groups],
  );

  const sortBy = useCallback(
    (mode: SortMode) => {
      if (mode === 'custom') {
        if (customGroups) applyGroups(syncGroups(customGroups, includedIds));
        setSortMode('custom');
        return;
      }
      // Sair do "Personalizado" guarda a divisão feita à mão para poder voltar.
      if (sortMode === 'custom') setCustomGroups(groups);
      applyGroups(regroup(groups, sortedIds(included, mode)));
      setSortMode(mode);
    },
    [applyGroups, customGroups, groups, included, includedIds, sortMode],
  );

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

      // Reeditando, baixar é só baixar: o agradecimento é do primeiro álbum, e
      // sair daqui jogaria fora mudanças ainda não guardadas.
      if (!succeeded || edit) return;

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
    [album.name, edit, included, exportAlbum, lang, router],
  );

  /** A segunda saída da etapa 5: criar o álbum na nuvem, ou reescrever o guardado. */
  const finishSave: FinishSave | null = !isSupabaseConfigured
    ? null
    : edit
      ? {
          label: t.saveEdits,
          busyLabel: t.saving,
          isSaving: editSave.isSaving,
          progressText:
            editSave.progress && editSave.progress.total > 0
              ? t.uploadingNew(editSave.progress.processed, editSave.progress.total)
              : null,
          error: editSave.error,
          onSave: () => {
            if (!composition) return;
            void editSave
              .save({
                albumId: edit.albumId,
                ownerId: edit.ownerId,
                title: album.name,
                photos: included,
                stored: edit.stored,
                album: composition,
              })
              .then((ok) => {
                if (!ok) return;
                // A página do álbum é server component: sem o refresh ela
                // voltaria do cache, com a composição de antes.
                router.push(`/album/${edit.albumId}`);
                router.refresh();
              });
          },
        }
      : {
          label: t.saveCloud,
          busyLabel: t.saving,
          isSaving: cloud.isSaving,
          progressText: cloud.progress
            ? t.cloudProgress(cloud.progress.processed, cloud.progress.total)
            : null,
          error: cloud.error,
          onSave: () => {
            if (composition) {
              cloud.save({ title: album.name, photos: included, album: composition });
            }
          },
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
        {/* Reeditando, a pessoa já está na conta: "Entrar" vira link comum. */}
        <AlbumTopBar onSignIn={edit ? undefined : () => setIsAuthOpen(true)} />
        <StepNav
          step={step}
          isAvailable={(n) => (n === 1 ? true : n === 2 ? hasPhotos : canBuild)}
          onGo={goTo}
        />
        {edit && (
          <p className="af-edit-ctx">
            <span>{edit.isOwner ? t.editContext : t.editContextGuest}</span>
            <Link href={`/album/${edit.albumId}`} className="af-edit-back">
              {t.backToAlbum}
            </Link>
          </p>
        )}
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
        open={isRebuildOpen}
        title={t.rebuildTitle}
        description={t.rebuildBody}
        confirmLabel={t.rebuildConfirm}
        cancelLabel={t.rebuildKeep}
        onConfirm={() => {
          setIsRebuildOpen(false);
          enter(composeFromGroups(groups, album.name, composition), rebuildTarget);
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
              coverColor={coverColor}
            />
          )}

          {step === 2 && (
            <StepOrder
              photos={included}
              groups={groups}
              outside={outside}
              sortMode={sortMode}
              onSort={sortBy}
              onMoveTo={moveTo}
              onRemove={remove}
              onRestore={include}
              onFiles={handleFiles}
              onContinue={() => goTo(3)}
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
              title={edit ? t.editFinishTitle : undefined}
              lead={edit ? t.editFinishLead : undefined}
              isExporting={isExporting}
              exportProgress={progress}
              exportError={error}
              save={finishSave}
              onDownload={() => void handleExport(composition)}
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
