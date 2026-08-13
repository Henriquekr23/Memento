/**
 * Textos da landing, nos dois idiomas do design original.
 *
 * O que também aparece em "Sobre", na barra e no rodapé (rótulo do botão de
 * montar, dicas, navegação) vive em `features/i18n/common.ts` — aqui fica só o
 * que é desta página.
 */

import type { Lang } from '@/features/i18n/lang';

export type { Lang };

export interface LandingStep {
  title: string;
  body: string;
  /** Aparece quando o passo é aberto na seção "Como funciona". */
  detail: string;
}

/** Um dos dois lados da seção "Antes e depois". */
export interface BeforeAfterPanel {
  badge: string;
  title: string;
  body: string;
}

export interface LandingCopy {
  tagline: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  heroSecondary: string;
  heroNote: string;
  photoPlaceholder: string;
  plateCta: string;
  plateAria: string;
  splitKicker: string;
  splitTitle: string;
  splitBody: string;
  comoKicker: string;
  comoHint: string;
  steps: LandingStep[];
  recursosKicker: string;
  features: { title: string; body: string }[];
  beforeAfter: {
    kicker: string;
    hint: string;
    title: string;
    ctaNote: string;
    before: BeforeAfterPanel;
    after: BeforeAfterPanel;
  };
  closingTitle: string;
}

export const COPY: Record<Lang, LandingCopy> = {
  pt: {
    tagline: 'Guarde a memória',
    heroLine1: 'Você envia as fotos.',
    heroLine2: 'A memória vira um álbum.',
    heroSecondary: 'Ver antes e depois',
    heroNote: 'Sem cadastro, sem envio para servidor. Roda no seu navegador.',
    heroSub:
      'Um casamento, uma viagem, o aniversário de dez anos atrás. Arraste as imagens para cá e o Memento coloca tudo em ordem pela data e hora gravadas em cada arquivo. Daí em diante quem monta é você: escolhe as páginas, ajusta a sequência, escreve o que só você lembra — e leva o álbum pronto para guardar.',
    photoPlaceholder: 'Suas fotos, em ordem',
    plateCta: 'Comece o seu álbum',
    plateAria: 'Começar a montar um álbum agora',
    splitKicker: 'O álbum',
    splitTitle: 'A ordem das fotos já conta metade da história',
    splitBody:
      'Cada imagem carrega a data e a hora em que foi feita — muitas vezes o lugar também. O Memento lê só isso e devolve a sequência real do que aconteceu, seja uma festa, uma viagem ou uma tarde qualquer que virou lembrança. O resto do trabalho é bom que continue seu: o que cada momento significou ninguém tem como adivinhar.',
    comoKicker: 'Como funciona',
    comoHint: 'Clique em um passo para ver o detalhe',
    steps: [
      {
        title: 'Enviar',
        body: 'Arraste as fotos ou escolha do dispositivo, quantas quiser de uma vez.',
        detail:
          'A leitura acontece na sua própria máquina. Nenhuma imagem é enviada a um servidor, então a espera é só o tempo do seu computador abrir os arquivos.',
      },
      {
        title: 'Ordenar',
        body: 'O Memento lê data e hora de cada imagem e monta a linha do tempo sozinho.',
        detail:
          'Fotos sem esses dados não ficam de fora: entram pela data do arquivo e recebem um selo, para você conferir se a posição ficou certa.',
      },
      {
        title: 'Montar',
        body: 'Escolha o layout das páginas, troque fotos de lugar, escreva as legendas.',
        detail:
          'Cada página tem seu próprio arranjo, e o que você tira do álbum vai para o depósito em vez de sumir — dá para voltar atrás a qualquer momento.',
      },
      {
        title: 'Guardar',
        body: 'Dê um nome ao álbum e baixe o resultado pronto.',
        detail:
          'Sai um arquivo ZIP com as fotos renomeadas na ordem final e um índice de texto com as legendas e as páginas que você escreveu.',
      },
    ],
    recursosKicker: 'Recursos',
    features: [
      {
        title: 'Sem inteligência artificial',
        body: 'Nenhuma legenda, título ou narrativa é inventada pelo sistema. Ele organiza o material; o que a memória significa continua sendo você quem conta.',
      },
      {
        title: 'Tudo no seu navegador',
        body: 'As fotos são lidas na sua máquina e não sobem para servidor nenhum. Fechar a aba basta para não sobrar rastro em lugar algum.',
      },
      {
        title: 'Metadados a seu favor',
        body: 'Data, hora e, quando existem, coordenadas são lidas do próprio arquivo — o bastante para acertar a ordem sem trabalho manual.',
      },
    ],
    beforeAfter: {
      kicker: 'Antes e depois',
      hint: 'As duas telas, lado a lado',
      title: 'A mesma viagem, na galeria do celular e no álbum',
      ctaNote: 'Leva o tempo de escolher as fotos.',
      before: {
        badge: 'Antes',
        title: 'Uma grade sem fim',
        body: 'No aplicativo de fotos tudo tem o mesmo tamanho e o mesmo peso: a paisagem, o recibo, a foto repetida três vezes. Achar aquele dia é rolar até cansar — e a memória fica onde ninguém volta.',
      },
      after: {
        badge: 'Depois',
        title: 'Um álbum com páginas',
        body: 'No Memento a foto que importa fica grande, o resto acompanha, e a legenda diz o que a imagem não conta. As datas dão a ordem; você dá o sentido — e no fim baixa o álbum pronto.',
      },
    },
    closingTitle: 'Comece pelas fotos que você já tem.',
  },
  en: {
    tagline: 'Keep the Memory',
    heroLine1: 'You bring the photos.',
    heroLine2: 'The memory becomes an album.',
    heroSecondary: 'See before and after',
    heroNote: 'No sign-up, nothing uploaded. It runs in your browser.',
    heroSub:
      'A wedding, a trip, a birthday from ten years ago. Drag the images in and Memento puts everything in order by the date and time written into each file. From there it’s yours to build: pick the pages, adjust the sequence, write down what only you remember — and take the finished album with you.',
    photoPlaceholder: 'Your photos, in order',
    plateCta: 'Start your album',
    plateAria: 'Start building an album now',
    splitKicker: 'The album',
    splitTitle: 'The order of the photos already tells half the story',
    splitBody:
      'Every image carries the date and time it was taken — often the place, too. Memento reads only that and gives back the real sequence of what happened, whether it was a party, a trip or an ordinary afternoon that turned into a keepsake. The rest is better left to you: what each moment meant is not something to be guessed.',
    comoKicker: 'How it works',
    comoHint: 'Click a step to see the detail',
    steps: [
      {
        title: 'Upload',
        body: 'Drag the photos in or pick them from your device, as many as you like.',
        detail:
          'Reading happens on your own machine. No image is sent to a server, so the only wait is your computer opening the files.',
      },
      {
        title: 'Sort',
        body: 'Memento reads the date and time of each image and builds the timeline on its own.',
        detail:
          'Photos without that data aren’t left out: they come in by file date and get a badge, so you can check whether the position looks right.',
      },
      {
        title: 'Build',
        body: 'Choose the page layouts, move photos around, write the captions.',
        detail:
          'Each page has its own arrangement, and anything you take out of the album goes to the tray instead of disappearing — you can always put it back.',
      },
      {
        title: 'Keep',
        body: 'Name the album and download the finished result.',
        detail:
          'You get a ZIP with the photos renamed in final order and a text index with the captions and pages you wrote.',
      },
    ],
    recursosKicker: 'Features',
    features: [
      {
        title: 'No artificial intelligence',
        body: 'No caption, title or narrative is invented by the system. It organizes the material; what the memory means is still yours to tell.',
      },
      {
        title: 'Runs in your browser',
        body: 'Photos are read on your machine and never uploaded anywhere. Closing the tab is enough to leave no trace behind.',
      },
      {
        title: 'Metadata working for you',
        body: 'Date, time and, when present, coordinates are read from the file itself — enough to get the order right with no manual work.',
      },
    ],
    beforeAfter: {
      kicker: 'Before and after',
      hint: 'Both screens, side by side',
      title: 'The same trip, in the phone gallery and in the album',
      ctaNote: 'It takes as long as picking the photos.',
      before: {
        badge: 'Before',
        title: 'An endless grid',
        body: 'In the photo app everything has the same size and the same weight: the landscape, the receipt, the shot taken three times. Finding that one day means scrolling until you give up — and the memory stays where nobody goes back.',
      },
      after: {
        badge: 'After',
        title: 'An album with pages',
        body: 'In Memento the photo that matters is the big one, the rest follows it, and the caption says what the image cannot. Dates give the order; you give the meaning — and at the end you download the finished album.',
      },
    },
    closingTitle: 'Start with the photos you already have.',
  },
};
