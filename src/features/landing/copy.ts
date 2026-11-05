/**
 * Textos da landing, nos dois idiomas.
 *
 * O que também aparece em "Sobre", na barra das outras telas e no rodapé
 * (rótulo do botão de montar, dicas, conta) vive em `features/i18n/common.ts`
 * — aqui fica só o que é desta página.
 *
 * Nomes de lugar ("Valparaíso", "Torres del Paine") não traduzem e vêm da
 * viagem de exemplo (`sampleTrip.ts`); o que muda de idioma é a moldura em
 * volta deles.
 */

import type { Lang } from '@/features/i18n/lang';

export type { Lang };

/** Um dos dois lados da seção "Antes e depois". */
export interface BeforeAfterPanel {
  badge: string;
  title: string;
  body: string;
}

/** Uma página esquerda do livro do herói: rótulo, título e corpo. */
export interface HeroPage {
  kicker: string;
  title: string;
  body: string;
}

/** As âncoras da página, na ordem em que as seções aparecem. */
export type LandingSectionId = 'como-funciona' | 'organizar' | 'antes-e-depois' | 'perguntas';

export const LANDING_SECTIONS: readonly LandingSectionId[] = [
  'como-funciona',
  'organizar',
  'antes-e-depois',
  'perguntas',
];

export interface LandingCopy {
  /** Dias da semana abreviados, de domingo a sábado — para "sáb 14". */
  weekdays: readonly string[];
  nav: {
    label: string;
    links: Record<LandingSectionId, string>;
    menu: string;
    close: string;
    /** Rótulo do diálogo da gaveta, para leitor de tela. */
    drawerLabel: string;
  };
  hero: {
    /** Rótulo da seção para leitor de tela: o livro é o herói inteiro. */
    bookLabel: string;
    coverKicker: string;
    /** O h1 da página. */
    coverTitle: string;
    /** As quatro páginas da esquerda, uma por abertura. */
    pages: readonly [HeroPage, HeroPage, HeroPage, HeroPage];
    exifDateLabel: string;
    exifPlaceLabel: string;
    /** "dom, 15 de março de 2026, 11:20" — a data por extenso da foto da página 3. */
    exifDate: string;
    /** O título que a pessoa deu ao álbum de exemplo. */
    albumTitle: string;
    secondaryCta: string;
    mosaicCaption: (photos: number, days: number) => string;
    /** Pontos cardeais abreviados, para as coordenadas ("33.046° S, 71.619° O"). */
    compass: { north: string; south: string; east: string; west: string };
  };
  organize: {
    title: string;
    /** O corpo do primeiro bloco muda conforme o aparelho: mouse ou toque. */
    bodyPointer: string;
    bodyTouch: string;
    /** "de 12 no lugar" — o número vem antes, em destaque. */
    counter: (total: number) => string;
    arrange: string;
    scramble: string;
    albumTitle: string;
    body: string;
    albumCounter: string;
    /** Cabeçalho da página direita do livro. */
    albumMonth: string;
    albumFoot: (count: number) => string;
    emptyPointer: string;
    emptyTouch: string;
  };
  beforeAfter: {
    kicker: string;
    title: string;
    lead: string;
    before: BeforeAfterPanel;
    after: BeforeAfterPanel;
    /** Rótulo do controle de comparação, para leitor de tela e teclado. */
    compareLabel: string;
    dragHint: string;
    /** A tela da galeria do celular, no lado "antes". */
    galleryTitle: string;
    galleryCount: string;
    gallerySelect: string;
  };
  faqTitle: string;
}

export const COPY: Record<Lang, LandingCopy> = {
  pt: {
    weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    nav: {
      label: 'Principal',
      links: {
        'como-funciona': 'Como funciona',
        organizar: 'Organizar',
        'antes-e-depois': 'Antes e depois',
        perguntas: 'Perguntas',
      },
      menu: 'Menu',
      close: 'Fechar',
      drawerLabel: 'Menu',
    },
    hero: {
      bookLabel: 'Como funciona o Memento',
      coverKicker: 'Keep the Journey',
      coverTitle: 'Suas fotos viram um álbum.',
      pages: [
        {
          kicker: 'Como funciona',
          title: 'Solte as fotos da viagem.',
          body: 'Do jeito que saíram da câmera: fora de ordem, com nomes que não dizem nada.',
        },
        {
          kicker: 'Como funciona',
          title: 'O Memento lê a data e o lugar de cada uma.',
          body: 'E monta a viagem na ordem em que aconteceu. Sem inteligência artificial: só o que a própria foto já guarda.',
        },
        {
          kicker: 'Como funciona',
          title: 'Você escolhe o que fica e dá o nome.',
          body: 'No fim, baixe em PDF ou mande o link para quem estava junto.',
        },
        {
          kicker: 'Sua vez',
          title: 'Agora, com as suas fotos.',
          body: 'Comece pela pasta da última viagem.',
        },
      ],
      exifDateLabel: 'Data',
      exifPlaceLabel: 'Lugar',
      exifDate: 'dom, 15 de março de 2026, 11:20',
      albumTitle: 'Chile de ponta a ponta',
      secondaryCta: 'Ver um exemplo',
      mosaicCaption: (photos, days) => `${photos} fotos, ${days} dias, em ordem`,
      compass: { north: 'N', south: 'S', east: 'L', west: 'O' },
    },
    organize: {
      title: 'Da bagunça ao álbum.',
      bodyPointer: 'Passe o mouse pelas fotos. Cada uma vai para o dia em que foi tirada.',
      bodyTouch: 'Toque nas fotos. Cada uma vai para o dia em que foi tirada.',
      counter: (total) => `de ${total} no lugar`,
      arrange: 'Arrumar tudo',
      scramble: 'Bagunçar de novo',
      albumTitle: 'E vira um álbum.',
      body: 'As fotos que você organizou entram no livro, na ordem certa. Com as suas, é igual.',
      albumCounter: 'fotos no álbum',
      albumMonth: 'março de 2026',
      albumFoot: (count) => (count === 1 ? '1 foto, em ordem' : `${count} fotos, em ordem`),
      emptyPointer: 'Nenhuma foto organizada ainda. Volte um pouco e passe o mouse nelas.',
      emptyTouch: 'Nenhuma foto organizada ainda. Volte um pouco e toque nelas.',
    },
    beforeAfter: {
      kicker: 'Antes e depois',
      title: 'A mesma viagem, guardada de dois jeitos.',
      lead: 'De um lado, milhares de fotos soltas na galeria do celular. Do outro, um álbum com começo, meio e fim.',
      before: {
        badge: 'Antes',
        title: 'Um rolo sem fim',
        body: 'Foto boa, foto tremida e print de conversa, tudo do mesmo tamanho. Achar aquele dia é rolar até cansar.',
      },
      after: {
        badge: 'Depois',
        title: 'Um álbum com páginas',
        body: 'A foto que importa fica grande, a data dá a ordem, e a legenda guarda o resto.',
      },
      compareLabel: 'Comparar a galeria do celular com o álbum',
      dragHint: 'Arraste para comparar',
      galleryTitle: 'Recentes',
      galleryCount: '2.418 itens',
      gallerySelect: 'Selecionar',
    },
    faqTitle: 'Perguntas frequentes',
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    nav: {
      label: 'Main',
      links: {
        'como-funciona': 'How it works',
        organizar: 'Organize',
        'antes-e-depois': 'Before and after',
        perguntas: 'Questions',
      },
      menu: 'Menu',
      close: 'Close',
      drawerLabel: 'Menu',
    },
    hero: {
      bookLabel: 'How Memento works',
      coverKicker: 'Keep the Journey',
      coverTitle: 'Your photos become an album.',
      pages: [
        {
          kicker: 'How it works',
          title: 'Drop in the trip photos.',
          body: 'Just as they came off the camera: out of order, with names that say nothing.',
        },
        {
          kicker: 'How it works',
          title: 'Memento reads the date and place of each one.',
          body: 'And lays the trip out in the order it happened. No artificial intelligence: only what the photo itself already keeps.',
        },
        {
          kicker: 'How it works',
          title: 'You choose what stays and give it a name.',
          body: 'At the end, download a PDF or send the link to whoever was there.',
        },
        {
          kicker: 'Your turn',
          title: 'Now, with your own photos.',
          body: 'Start with the folder from your last trip.',
        },
      ],
      exifDateLabel: 'Date',
      exifPlaceLabel: 'Place',
      exifDate: 'Sun, March 15, 2026, 11:20',
      albumTitle: 'Chile end to end',
      secondaryCta: 'See an example',
      mosaicCaption: (photos, days) => `${photos} photos, ${days} days, in order`,
      compass: { north: 'N', south: 'S', east: 'E', west: 'W' },
    },
    organize: {
      title: 'From mess to album.',
      bodyPointer: 'Move the mouse over the photos. Each one goes to the day it was taken.',
      bodyTouch: 'Tap the photos. Each one goes to the day it was taken.',
      counter: (total) => `of ${total} in place`,
      arrange: 'Sort them all',
      scramble: 'Mess them up again',
      albumTitle: 'And it becomes an album.',
      body: 'The photos you sorted go into the book, in the right order. With yours, it works the same.',
      albumCounter: 'photos in the album',
      albumMonth: 'March 2026',
      albumFoot: (count) => (count === 1 ? '1 photo, in order' : `${count} photos, in order`),
      emptyPointer: 'No photos sorted yet. Scroll back a little and move the mouse over them.',
      emptyTouch: 'No photos sorted yet. Scroll back a little and tap them.',
    },
    beforeAfter: {
      kicker: 'Before and after',
      title: 'The same trip, kept two different ways.',
      lead: 'On one side, thousands of loose photos in your phone gallery. On the other, an album with a beginning, a middle and an end.',
      before: {
        badge: 'Before',
        title: 'An endless roll',
        body: 'A good shot, a blurry one and a screenshot of a chat, all the same size. Finding that one day means scrolling until you give up.',
      },
      after: {
        badge: 'After',
        title: 'An album with pages',
        body: 'The photo that matters is the big one, the date gives the order, and the caption keeps the rest.',
      },
      compareLabel: 'Compare the phone gallery with the album',
      dragHint: 'Drag to compare',
      galleryTitle: 'Recents',
      galleryCount: '2,418 items',
      gallerySelect: 'Select',
    },
    faqTitle: 'Frequently asked questions',
  },
};
