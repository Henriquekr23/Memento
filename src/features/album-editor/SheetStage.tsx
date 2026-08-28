'use client';

import { useRef } from 'react';

import { SPEC } from '@/features/album-print/spec';
import type { EditorAlbum, PageTextBlock, PhotoFrame } from '@/types/album-editor';

import { PageContent, type PhotoResolver } from './PageContent';
import { PageView } from './PageView';
import { PrintGuides } from './PrintGuides';
import { TURN_MS, type SheetTurn, type TurnDirection } from './useSheetTurn';

type Hand = 'left' | 'right';

interface SheetStageProps {
  album: EditorAlbum;
  sheets: [number, number][];
  sheetIndex: number;
  turn: SheetTurn;
  ppm: number;
  guides: boolean;
  ink: string;
  resolve: PhotoResolver;
  activeSide: Hand;
  onActiveSide: (side: Hand) => void;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  onFrame: (pageIndex: number, slot: number, changes: Partial<PhotoFrame>) => void;
  onDropPhoto: (pageIndex: number, slot: number, photoId: string) => void;
  selectedTextId: string | null;
  onSelectText: (pageIndex: number, id: string | null) => void;
  onTextChange: (pageIndex: number, id: string, changes: Partial<PageTextBlock>) => void;
  hideNumber: boolean;
  hint: string;
}

/**
 * A folha aberta do miolo — e o gesto de virar página.
 *
 * A folha é sempre desenhada como duas metades de largura igual, e não como
 * duas páginas encostadas: é a metade que gira em torno da lombada quando o
 * usuário arrasta. Sem essa simetria a folha em movimento não fecha em cima da
 * de baixo, e a virada vira um retângulo deslizando.
 */
export function SheetStage({
  album,
  sheets,
  sheetIndex,
  turn,
  ppm,
  guides,
  ink,
  resolve,
  activeSide,
  onActiveSide,
  selectedSlot,
  onSelectSlot,
  onFrame,
  onDropPhoto,
  selectedTextId,
  onSelectText,
  onTextChange,
  hideNumber,
  hint,
}: SheetStageProps) {
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const pageW = (SPEC.trim.w + SPEC.bleed * 2) * ppm;
  const pageH = (SPEC.trim.h + SPEC.bleed * 2) * ppm;
  // Sem guias as duas áreas finais se encostam, como no livro pronto; com
  // guias a sangria aparece inteira e nada é recortado.
  const overlap = guides ? 0 : SPEC.bleed * 2 * ppm;
  const sheetW = pageW * 2 - overlap;
  const halfW = sheetW / 2;

  const state = turn.turn;
  const turning = state !== null;
  const progress = state?.progress ?? 0;

  const neighbour =
    state && sheets[sheetIndex + (state.direction === 'next' ? 1 : -1)];

  /** Uma metade da folha: a página daquela mão, recortada no meio da lombada. */
  const half = (
    hand: Hand,
    sheet: [number, number] | undefined,
    editable: boolean,
  ) => {
    if (!sheet) return null;
    const [leftIndex, rightIndex] = sheet;
    const leftPage = album.pages[leftIndex];
    const rightPage = album.pages[rightIndex];
    if (!leftPage || !rightPage) return null;

    // Folha espelhada: uma foto só, do tamanho das duas páginas. A metade
    // recorta o pedaço que lhe cabe — os dois lados são o mesmo desenho.
    if (leftPage.spread) {
      const left = -overlap / 2 - (hand === 'right' ? halfW : 0);
      return (
        <div className="ae-half-inner" style={{ left, width: pageW * 2, height: pageH }}>
          <div className="ae-page" style={{ width: pageW * 2, height: pageH }}>
            <PageContent
              page={leftPage}
              ppm={ppm}
              ink={ink}
              resolve={resolve}
              bleedMm={SPEC.bleed}
              spineSide="left"
              editable={editable}
              selectedSlot={editable ? 0 : -1}
              onFrame={(slot, changes) => onFrame(leftIndex, slot, changes)}
              onDropPhoto={(slot, photoId) => onDropPhoto(leftIndex, slot, photoId)}
              selectedTextId={editable ? selectedTextId : null}
              onSelectText={(id) => onSelectText(leftIndex, id)}
              onTextChange={(id, changes) => onTextChange(leftIndex, id, changes)}
            />
            <PrintGuides ppm={ppm} spineSide="left" show={guides} />
          </div>
        </div>
      );
    }

    const index = hand === 'left' ? leftIndex : rightIndex;
    const page = hand === 'left' ? leftPage : rightPage;

    return (
      <div
        className="ae-half-inner"
        style={{ left: hand === 'left' ? 0 : -overlap / 2, width: pageW, height: pageH }}
        onPointerDownCapture={editable ? () => onActiveSide(hand) : undefined}
      >
        <PageView
          page={page}
          index={index}
          ppm={ppm}
          hand={hand}
          guides={guides}
          ink={ink}
          resolve={resolve}
          editable={editable}
          selectedSlot={editable && activeSide === hand ? selectedSlot : -1}
          onSelectSlot={(slot) => {
            onActiveSide(hand);
            onSelectSlot(slot);
          }}
          onFrame={(slot, changes) => onFrame(index, slot, changes)}
          onDropPhoto={(slot, photoId) => onDropPhoto(index, slot, photoId)}
          selectedTextId={editable && activeSide === hand ? selectedTextId : null}
          onSelectText={(id) => {
            onActiveSide(hand);
            onSelectText(index, id);
          }}
          onTextChange={(id, changes) => onTextChange(index, id, changes)}
          hideNumber={hideNumber}
        />
      </div>
    );
  };

  /* A folha de baixo: durante a virada, um dos lados já é o da folha vizinha. */
  const current = sheets[sheetIndex];
  const baseLeft =
    state?.direction === 'prev' ? (neighbour || current) : current;
  const baseRight =
    state?.direction === 'next' ? (neighbour || current) : current;

  const startDrag = (direction: TurnDirection, event: React.PointerEvent) => {
    if (event.button !== 0) return;
    if (!turn.begin(direction, event.clientX, halfW)) return;
    event.preventDefault();
    drag.current = { x: event.clientX, moved: false };

    const move = (ev: PointerEvent) => {
      if (drag.current && Math.abs(ev.clientX - drag.current.x) > 4) {
        drag.current.moved = true;
      }
      turn.update(ev.clientX);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // Clique parado na borda também vira: é o gesto de quem não arrasta.
      turn.end(!drag.current?.moved);
      drag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const leafOnRight = state?.direction === 'next';
  const angle = leafOnRight ? -progress * 180 : progress * 180;
  const lift = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI);

  /*
   * Sombreado da folha em movimento.
   *
   * As duas faces têm que chegar a **zero** exatamente onde a folha pousa — e
   * ela pousa em cima de uma página que não tem sombra nenhuma. Enquanto a face
   * de trás terminava a virada ainda com 0,24 de preto e a folha carregava um
   * `box-shadow` fixo, o quadro em que ela era desmontada clareava a página de
   * uma vez: era esse degrau, e não a animação, o "piscar" da página da
   * esquerda a cada virada. Agora as três curvas nascem e morrem em zero, e o
   * que some no fim da virada já não estava pintando nada.
   */
  const faceShade = lift * 0.55;
  const backShade = Math.max(0, 1 - progress) * 0.42;
  const leafShadow = lift * 0.45;

  return (
    /*
     * A perspectiva é **proporcional à folha**, não um número fixo: com um
     * valor fixo, a mesma virada projeta pouco numa folha pequena e infla a
     * página inteira quando o zoom deixa a folha grande — era esse o
     * "aumentou e depois encolheu" a cada troca de página. Preso à largura, o
     * efeito da virada é o mesmo em qualquer escala — e a câmera fica longe o
     * bastante (4,5 larguras) para a folha girar sem inchar: no meio da virada
     * ela cresce ~12%, e não os ~25% de antes.
     */
    <div
      className="ae-flip"
      style={{ width: sheetW, height: pageH, perspective: sheetW * 4.5 }}
    >
      {/* A sombra projetada mora **fora** da caixa 3D e não se mexe: dentro
          dela ela era reordenada em profundidade junto com a folha que gira, e
          desregulava no meio da virada. Mesma razão do `.ae-3d-cast` do livro. */}
      <div className="ae-sheet-cast" aria-hidden />
      <div className="ae-sheet" style={{ width: sheetW, height: pageH }}>
        <div className="ae-half" style={{ left: 0, width: halfW, height: pageH }}>
          {half('left', baseLeft, !turning)}
        </div>
        <div className="ae-half" style={{ left: halfW, width: halfW, height: pageH }}>
          {half('right', baseRight, !turning)}
        </div>

        {state && neighbour && (
          <div
            className="ae-leaf"
            style={{
              left: leafOnRight ? halfW : 0,
              width: halfW,
              height: pageH,
              transformOrigin: leafOnRight ? 'left center' : 'right center',
              transform: `rotateY(${angle}deg)`,
              transition: state.animating
                ? `transform ${TURN_MS}ms cubic-bezier(0.22,0.61,0.36,1)`
                : 'none',
            }}
          >
            <div
              className="ae-leaf-face"
              style={{ boxShadow: `0 8px 26px -10px rgba(0,0,0,${leafShadow.toFixed(3)})` }}
            >
              {half(leafOnRight ? 'right' : 'left', current, false)}
              <div
                className="ae-leaf-shade"
                style={{
                  opacity: faceShade,
                  background: `linear-gradient(to ${leafOnRight ? 'left' : 'right'}, rgba(0,0,0,.04), rgba(0,0,0,.62))`,
                }}
              />
            </div>
            <div
              className="ae-leaf-face is-back"
              style={{
                transform: 'rotateY(180deg)',
                boxShadow: `0 8px 26px -10px rgba(0,0,0,${leafShadow.toFixed(3)})`,
              }}
            >
              {half(leafOnRight ? 'left' : 'right', neighbour, false)}
              <div
                className="ae-leaf-shade"
                style={{
                  opacity: backShade,
                  background: `linear-gradient(to ${leafOnRight ? 'right' : 'left'}, rgba(0,0,0,.02), rgba(0,0,0,.4))`,
                }}
              />
            </div>
          </div>
        )}

        <div className="ae-gutter" style={{ opacity: 0.75 + lift * 0.25 }} />
        <div className="ae-sheet-paper" />
      </div>

      {/* Bordas de folhear: só as faixas externas, para não roubar o arraste de
          enquadramento da foto, que vive no meio da página. */}
      <span
        className="ae-flip-edge is-prev"
        style={{ width: Math.min(56, halfW * 0.18) }}
        onPointerDown={(event) => startDrag('prev', event)}
        aria-hidden
      />
      <span
        className="ae-flip-edge is-next"
        style={{ width: Math.min(56, halfW * 0.18) }}
        onPointerDown={(event) => startDrag('next', event)}
        aria-hidden
      />
      <p className="ae-flip-hint">{hint}</p>
    </div>
  );
}
