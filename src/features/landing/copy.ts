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
  /** Linha miúda embaixo do passo, com o detalhe que não cabe no resumo. */
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
  /** Pedaço da segunda linha antes da palavra que troca. */
  heroLine2Before: string;
  /**
   * As palavras que se revezam no herói. Cada uma já vem com o artigo, porque
   * o gênero muda ("a viagem", "o casamento") e concatenar artigo fixo daria
   * frase errada em português.
   */
  heroWords: string[];
  /** A terceira linha, depois da palavra que troca — sempre em linha própria. */
  heroLine2After: string;
  heroSub: string;
  heroSecondary: string;
  heroNote: string;
  /** Texto alternativo da foto de fundo do herói. */
  heroPhotoAlt: string;
  comoKicker: string;
  steps: LandingStep[];
  recursosKicker: string;
  recursosTitle: string;
  features: { title: string; body: string }[];
  beforeAfter: {
    kicker: string;
    title: string;
    lead: string;
    /** Legenda da ilustração da página montada, no painel "Depois". */
    afterCaption: string;
    before: BeforeAfterPanel;
    after: BeforeAfterPanel;
  };
  faqTitle: string;
  closingTitle: string;
  closingBody: string;
}

export const COPY: Record<Lang, LandingCopy> = {
  pt: {
    tagline: 'Guarde a memória',
    heroLine1: 'Clique.',
    heroLine2Before: 'E ',
    heroWords: ['a viagem', 'o casamento', 'a formatura', 'o ano', 'a memória'],
    heroLine2After: 'virou álbum.',
    heroSub:
      'Cada foto carrega a data em que foi tirada. O Memento usa isso pra montar a ordem, e o resto do álbum é você quem escreve.',
    heroSecondary: 'Ver antes e depois',
    heroNote: 'Sem cadastro pra começar. Suas fotos ficam no seu navegador.',
    heroPhotoAlt: '',
    comoKicker: 'Como funciona',
    steps: [
      {
        title: 'Enviar',
        body: 'Arraste quantas fotos quiser, do computador ou do celular.',
        detail: 'A leitura acontece na sua máquina: a espera é só o tempo de abrir os arquivos.',
      },
      {
        title: 'Ordenar',
        body: 'O Memento lê a data de cada foto e monta a linha do tempo sozinho.',
        detail: 'Foto sem data entra pela data do arquivo e recebe um selo, pra você conferir.',
      },
      {
        title: 'Montar',
        body: 'Escolha o layout de cada página, troque fotos de lugar e escreva as legendas.',
        detail: 'O que você tira do álbum vai pro depósito em vez de sumir — dá pra voltar atrás.',
      },
      {
        title: 'Guardar',
        body: 'Baixe o álbum pronto em PDF: capa, miolo e contracapa.',
        detail: 'Gerado do arquivo original, em resolução cheia, sem passar por servidor nenhum.',
      },
    ],
    recursosKicker: 'Recursos',
    recursosTitle: 'O que o Memento faz — e o que ele deixa pra você.',
    features: [
      {
        title: 'Sem inteligência artificial',
        body: 'Nenhuma legenda, título ou narrativa é inventada pelo sistema. Ele organiza o material; o que a memória significa continua sendo você quem conta.',
      },
      {
        title: 'Tudo no seu navegador',
        body: 'As fotos são lidas na sua máquina, e nada sobe sem você mandar. Salvar na nuvem é um botão, não o caminho padrão — e o que sobe é uma cópia reduzida, sem os metadados do arquivo.',
      },
      {
        title: 'Metadados a seu favor',
        body: 'Data, hora e, quando existem, coordenadas são lidas do próprio arquivo — o bastante para acertar a ordem sem trabalho manual.',
      },
    ],
    beforeAfter: {
      kicker: 'Antes e depois',
      title: 'A mesma viagem, guardada de dois jeitos.',
      lead: 'De um lado, milhares de fotos soltas na galeria do celular. Do outro, um álbum com começo, meio e fim.',
      afterCaption: 'Uma página do álbum montado',
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
    },
    faqTitle: 'Perguntas frequentes',
    closingTitle: 'Comece pelas fotos que você já tem.',
    closingBody: 'Leva o tempo de escolher as fotos.',
  },
  en: {
    tagline: 'Keep the Memory',
    heroLine1: 'Click.',
    heroLine2Before: 'And the ',
    heroWords: ['trip', 'wedding', 'graduation', 'year', 'memory'],
    heroLine2After: 'became an album.',
    heroSub:
      'Every photo carries the date it was taken. Memento uses that to sort them out, and the rest of the album is yours to write.',
    heroSecondary: 'See before and after',
    heroNote: 'No sign-up to start. Your photos stay in your browser.',
    heroPhotoAlt: '',
    comoKicker: 'How it works',
    steps: [
      {
        title: 'Upload',
        body: 'Drag in as many photos as you like, from your computer or phone.',
        detail: 'Reading happens on your own machine: the only wait is opening the files.',
      },
      {
        title: 'Sort',
        body: 'Memento reads the date on each photo and builds the timeline on its own.',
        detail: 'A photo with no date comes in by file date and gets a badge, so you can check it.',
      },
      {
        title: 'Build',
        body: "Choose each page's layout, move photos around, write the captions.",
        detail: 'Anything you take out goes to the tray instead of disappearing — you can undo it.',
      },
      {
        title: 'Keep',
        body: 'Download the finished album as a PDF: cover, body and back cover.',
        detail: 'Built from the original file, at full resolution, without touching a server.',
      },
    ],
    recursosKicker: 'Features',
    recursosTitle: 'What Memento does — and what it leaves to you.',
    features: [
      {
        title: 'No artificial intelligence',
        body: 'No caption, title or narrative is invented by the system. It organizes the material; what the memory means is still yours to tell.',
      },
      {
        title: 'Runs in your browser',
        body: 'Photos are read on your machine, and nothing goes up unless you say so. Saving to the cloud is a button, not the default path — and what goes up is a reduced copy, without the file metadata.',
      },
      {
        title: 'Metadata working for you',
        body: 'Date, time and, when present, coordinates are read from the file itself — enough to get the order right with no manual work.',
      },
    ],
    beforeAfter: {
      kicker: 'Before and after',
      title: 'The same trip, kept two different ways.',
      lead: 'On one side, thousands of loose photos in your phone gallery. On the other, an album with a beginning, a middle and an end.',
      afterCaption: 'A page from the finished album',
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
    },
    faqTitle: 'Frequently asked questions',
    closingTitle: 'Start with the photos you already have.',
    closingBody: 'It takes as long as picking the photos.',
  },
};
