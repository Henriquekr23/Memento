'use client';

import { useEffect, useRef, useState } from 'react';

import type { EditorPage, PageTextBlock, PhotoFrame } from '@/types/album-editor';

import { cropRatios, clampOffset } from './frameCrop';
import { IconImage } from './icons';
import { pageInsets } from './pageLayout';
import { PageTextView } from './PageTextView';
import { round, useDrag } from './useDrag';
import type { SpineSide } from './PrintGuides';
import { COVER_FONTS } from './palette';

/** Como o componente descobre a URL de uma foto a partir do id guardado no slot. */
export type PhotoResolver = (photoId: string | null) => string | null;

interface FramedPhotoProps {
  frame: PhotoFrame;
  resolve: PhotoResolver;
  ppm: number;
  editable?: boolean;
  onPan?: (patch: Partial<PhotoFrame>) => void;
  /** Chamado no toque, antes do arraste: pegar a foto já é escolhê-la. */
  onGrab?: () => void;
  alt?: string;
}

/**
 * A foto dentro do quadro.
 *
 * Não é mais `object-fit` com `transform` por cima. A foto é posicionada por
 * conta própria dentro de uma **caixa de recorte**, do tamanho exato que o
 * encaixe e o zoom pedem, e o arraste move essa foto — não o elemento inteiro.
 * Três coisas dependiam disso:
 *
 * 1. **O arraste nunca trava.** Antes o quadro só ficava arrastável *depois* de
 *    selecionado, e o toque que selecionava era justamente o que começaria o
 *    gesto: era preciso clicar, soltar e só então arrastar. Agora o próprio
 *    toque na foto seleciona o quadro e já começa a mover.
 * 2. **A foto não escapa.** O limite sai do tamanho real da imagem e do zoom
 *    corrente (`frameCrop`), e não de um ±40 fixo que não sabia nem uma coisa
 *    nem outra — era ele que abria papel vazio dentro do quadro e empurrava a
 *    foto para fora da página.
 * 3. **O recorte nunca é destrutivo.** O deslocamento guardado continua
 *    inteiro; quem desenha é que o poda ao que o zoom permite. Afastar e voltar
 *    a aproximar devolve o enquadramento escolhido em vez de esquecê-lo.
 */
export function FramedPhoto({
  frame,
  resolve,
  ppm,
  editable = false,
  onPan,
  onGrab,
  alt = '',
}: FramedPhotoProps) {
  const startDrag = useDrag();
  const boxRef = useRef<HTMLDivElement>(null);
  /** Proporção do quadro, medida. As razões do recorte só dependem dela. */
  const [aspect, setAspect] = useState(0);
  /** Tamanho natural da foto carregada — a chave evita usar a medida da anterior. */
  const [loaded, setLoaded] = useState<{ src: string; w: number; h: number } | null>(null);

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = rect.width / rect.height;
      // Só re-renderiza quando a proporção muda de verdade: o zoom do palco
      // muda o tamanho do quadro a cada quadro de animação, não a forma dele.
      setAspect((current) => (Math.abs(current - next) < 0.001 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const src = resolve(frame.photoId);
  const natural = loaded && loaded.src === src ? loaded : null;

  const ratios = cropRatios(
    aspect,
    1,
    natural?.w ?? 0,
    natural?.h ?? 0,
    frame.fit,
    frame.zoom,
  );
  const offsetX = clampOffset(frame.offsetX, ratios.maxX);
  const offsetY = clampOffset(frame.offsetY, ratios.maxY);

  const pan = (event: React.PointerEvent) => {
    onGrab?.();
    if (!editable || !onPan || !natural) return;
    const node = boxRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    // O deslocamento é % do lado **desenhado** da foto: é essa a régua que o
    // arquivo de impressão usa, e é ela que faz o gesto acompanhar o ponteiro.
    const drawW = rect.width * ratios.rw;
    const drawH = rect.height * ratios.rh;
    if (drawW <= 0 || drawH <= 0) return;
    const origin = { x: offsetX, y: offsetY };

    startDrag(event, (dx, dy) => {
      onPan({
        offsetX: clampOffset(round(origin.x + (dx / drawW) * 100, 2), ratios.maxX),
        offsetY: clampOffset(round(origin.y + (dy / drawH) * 100, 2), ratios.maxY),
      });
    });
  };

  if (!src) {
    return (
      <div className="ae-crop" ref={boxRef}>
        <div className="ae-empty">
          <IconImage size={Math.max(13, Math.min(30, ppm * 6))} />
        </div>
      </div>
    );
  }

  // Enquanto o arquivo não carregou não há tamanho natural, e o encaixe do CSS
  // dá o mesmo resultado que a conta daria com zoom 1 e sem deslocamento.
  const geometry: React.CSSProperties = natural
    ? {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${ratios.rw * 100}%`,
        height: `${ratios.rh * 100}%`,
        transform: `translate(-50%, -50%) translate(${offsetX}%, ${offsetY}%)`,
      }
    : {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: frame.fit,
      };

  return (
    <div className="ae-crop" ref={boxRef}>
      {/* A foto é decorativa dentro da página: o conteúdo do álbum é a
          composição, e uma descrição inventada por nós seria pior que nenhuma. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onPointerDown={pan}
        onLoad={(event) =>
          setLoaded({
            src,
            w: event.currentTarget.naturalWidth,
            h: event.currentTarget.naturalHeight,
          })
        }
        style={{
          ...geometry,
          display: 'block',
          maxWidth: 'none',
          touchAction: 'none',
          cursor: editable ? 'grab' : 'default',
        }}
      />
    </div>
  );
}

interface PageContentProps {
  page: EditorPage;
  ppm: number;
  ink: string;
  resolve: PhotoResolver;
  editable?: boolean;
  selectedSlot?: number;
  onSelectSlot?: (index: number) => void;
  onFrame?: (index: number, patch: Partial<PhotoFrame>) => void;
  onDropPhoto?: (index: number, photoId: string) => void;
  /** Blocos de texto: seleção e edição no lugar. */
  selectedTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  onTextChange?: (id: string, patch: Partial<PageTextBlock>) => void;
  /**
   * Quanta sangria existe além do corte neste contêiner.
   * As margens são sempre medidas da **página final**: assim a miniatura (sem
   * sangria) e a página de impressão (com 5 mm) mostram exatamente o mesmo
   * enquadramento, em vez de duas composições parecidas.
   */
  bleedMm?: number;
  spineSide?: SpineSide;
}

/** Tipo de dado do arrasto da bandeja para o quadro. */
export const PHOTO_DND_TYPE = 'text/memento-photo';

export function PageContent({
  page,
  ppm,
  ink,
  resolve,
  editable = false,
  selectedSlot = -1,
  onSelectSlot,
  onFrame,
  onDropPhoto,
  selectedTextId = null,
  onSelectText,
  onTextChange,
  bleedMm = 0,
  spineSide = 'left',
}: PageContentProps) {
  /** Quadro sob o arrasto de uma foto da bandeja — realce de alvo, só isso. */
  const [overSlot, setOverSlot] = useState(-1);

  const insets = pageInsets(page, spineSide, bleedMm);
  const gap = insets.gap * ppm;
  const top = insets.top * ppm;
  const bottom = insets.bottom * ppm;
  const left = insets.left * ppm;
  const right = insets.right * ppm;

  /**
   * Função comum, chamada como `slot(0, style)` — **não** um componente usado
   * como `<Slot />`. Virando componente, o React remonta o `<img>` a cada
   * render e o arraste de enquadramento pisca. Já foi corrigido uma vez.
   */
  const slot = (index: number, style: React.CSSProperties) => (
    <div
      key={index}
      className={[
        'ae-slot',
        editable && selectedSlot === index ? 'is-selected' : '',
        overSlot === index ? 'is-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onPointerDown={() => editable && onSelectSlot?.(index)}
      onDragOver={(event) => {
        if (!editable) return;
        event.preventDefault();
        if (overSlot !== index) setOverSlot(index);
      }}
      onDragLeave={() => setOverSlot((current) => (current === index ? -1 : current))}
      onDrop={(event) => {
        setOverSlot(-1);
        if (!editable) return;
        event.preventDefault();
        const photoId = event.dataTransfer.getData(PHOTO_DND_TYPE);
        if (photoId) onDropPhoto?.(index, photoId);
      }}
    >
      <FramedPhoto
        frame={page.slots[index]}
        resolve={resolve}
        ppm={ppm}
        editable={editable}
        onGrab={() => {
          if (!editable) return;
          onSelectSlot?.(index);
          onSelectText?.(null);
        }}
        onPan={(patch) => onFrame?.(index, patch)}
      />
    </div>
  );

  /**
   * Camada dos textos, encaixada exatamente sobre a **área final**: as
   * coordenadas de um bloco são % do que vai ser impresso, como as da capa.
   * Medir a partir do arquivo com sangria deixaria "centralizado" 2,5 mm fora
   * do centro da página.
   */
  const textLayer = (behind: boolean) => {
    const blocks = page.textBlocks.filter((block) => block.behind === behind);
    if (blocks.length === 0) return null;
    return (
      <div
        className={`ae-page-live${behind ? ' is-behind' : ' is-front'}`}
        style={{ inset: bleedMm * ppm }}
      >
        {blocks.map((block) => (
          <PageTextView
            key={block.id}
            block={block}
            ppm={ppm}
            ink={ink}
            selected={editable && selectedTextId === block.id}
            live={editable}
            onSelect={() => onSelectText?.(block.id)}
            onChange={(patch) => onTextChange?.(block.id, patch)}
          />
        ))}
      </div>
    );
  };

  const body = () => {
    if (page.layout === 'text') {
      // A página "só texto" continua com margem: ali o papel é o fundo, e o
      // preenchimento total não tem o que preencher.
      const margins = pageInsets({ ...page, fill: false }, spineSide, bleedMm);
      return (
        <div
          style={{
            position: 'absolute',
            top: margins.top * ppm,
            bottom: margins.bottom * ppm,
            left: margins.left * ppm,
            right: margins.right * ppm,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: ink,
          }}
        >
          <div
            style={{
              fontFamily: COVER_FONTS[0].stack,
              fontSize: 9 * ppm,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              marginBottom: 4 * ppm,
            }}
          >
            {page.heading}
          </div>
          <div
            style={{
              fontFamily: COVER_FONTS[5].stack,
              fontWeight: 400,
              fontSize: 3.4 * ppm,
              lineHeight: 1.5,
              maxWidth: '34ch',
              opacity: 0.85,
            }}
          >
            {page.body}
          </div>
        </div>
      );
    }

    const box: React.CSSProperties = { position: 'absolute', overflow: 'hidden' };

    if (page.layout === 'full') {
      /**
       * Foto sangrada de borda a borda — o padrão do álbum. Por cima dela vai o
       * **efeito de página**: a sombra da dobra do lado da lombada, o
       * escurecimento leve das bordas de corte e o brilho de papel na quina de
       * cima. Sem isso a foto vira um retângulo solto na tela; com isso ela se
       * lê como página impressa, que era a única coisa que a margem branca
       * resolvia. Nas miniaturas (ppm baixo) o efeito não entra: ali ele só
       * sujaria.
       */
      return (
        <>
          {slot(0, { ...box, inset: 0 })}
          {ppm > 0.6 && !page.spread && (
            <span className={`ae-fold is-${spineSide}`} aria-hidden />
          )}
        </>
      );
    }

    if (page.layout === 'inset') {
      // "Com margem" é o layout de quem quer a moldura: aqui o preenchimento
      // total não manda, senão os dois layouts de uma foto virariam o mesmo.
      const margins = pageInsets({ ...page, fill: false }, spineSide, bleedMm);
      return slot(0, {
        ...box,
        top: margins.top * ppm,
        bottom: margins.bottom * ppm,
        left: margins.left * ppm,
        right: margins.right * ppm,
      });
    }

    if (page.layout === 'duoV') {
      return (
        <>
          {slot(0, {
            ...box,
            top,
            bottom,
            left,
            width: `calc(50% - ${left + gap / 2}px)`,
          })}
          {slot(1, {
            ...box,
            top,
            bottom,
            right,
            width: `calc(50% - ${right + gap / 2}px)`,
          })}
        </>
      );
    }

    if (page.layout === 'duoH') {
      return (
        <>
          {slot(0, {
            ...box,
            left,
            right,
            top,
            height: `calc(50% - ${top + gap / 2}px)`,
          })}
          {slot(1, {
            ...box,
            left,
            right,
            bottom,
            height: `calc(50% - ${bottom + gap / 2}px)`,
          })}
        </>
      );
    }

    if (page.layout === 'trio') {
      return (
        <>
          {slot(0, {
            ...box,
            left,
            right,
            top,
            height: `calc(58% - ${top}px)`,
          })}
          {slot(1, {
            ...box,
            left,
            bottom,
            width: `calc(50% - ${left + gap / 2}px)`,
            height: `calc(42% - ${bottom + gap}px)`,
          })}
          {slot(2, {
            ...box,
            right,
            bottom,
            width: `calc(50% - ${right + gap / 2}px)`,
            height: `calc(42% - ${bottom + gap}px)`,
          })}
        </>
      );
    }

    return (
      <>
        {[0, 1, 2, 3].map((i) =>
          slot(i, {
            ...box,
            left: i % 2 === 0 ? left : `calc(50% + ${gap / 2}px)`,
            right: i % 2 === 1 ? right : `calc(50% + ${gap / 2}px)`,
            top: i < 2 ? top : `calc(50% + ${gap / 2}px)`,
            bottom: i > 1 ? bottom : `calc(50% + ${gap / 2}px)`,
          }),
        )}
      </>
    );
  };

  return (
    <>
      {textLayer(true)}
      {body()}
      {textLayer(false)}
    </>
  );
}
