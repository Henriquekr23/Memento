/** Textos da página "Sobre", nos dois idiomas. */

import type { Lang } from '@/features/i18n/lang';

export interface AboutCopy {
  kicker: string;
  title: string;
  lead: string;
  sections: { heading: string; body: string }[];
  stackKicker: string;
  stackNote: string;
  authorKicker: string;
  authorTitle: string;
  authorBody: string;
  backToAlbum: string;
}

/** A pilha da Fase 1. Igual para os dois idiomas — nomes próprios não traduzem. */
export const STACK = [
  { name: 'Next.js 16', role: { pt: 'App Router', en: 'App Router' } },
  { name: 'React 19', role: { pt: 'interface', en: 'interface' } },
  { name: 'TypeScript', role: { pt: 'tipagem', en: 'typing' } },
  { name: 'Tailwind v4', role: { pt: 'estilo', en: 'styling' } },
  { name: 'exifr', role: { pt: 'metadados EXIF', en: 'EXIF metadata' } },
  { name: 'dnd-kit', role: { pt: 'arrastar e soltar', en: 'drag and drop' } },
] as const;

export const ABOUT: Record<Lang, AboutCopy> = {
  pt: {
    kicker: 'Sobre',
    title: 'Um álbum é uma escolha, não um depósito',
    lead: 'O Memento nasceu de um problema simples: a galeria do celular guarda tudo e não conta nada. Ele lê a data e a hora gravadas em cada foto, devolve a sequência do que aconteceu e deixa a curadoria com quem viveu aquilo.',
    sections: [
      {
        heading: 'Por que sem inteligência artificial',
        body: 'Legenda gerada por máquina descreve o que está na imagem; ela não sabe por que aquela tarde importou. Fazer o sistema escrever no seu lugar seria trocar a memória por um resumo dela. O Memento organiza o material e para aí — o significado é a parte que só você tem.',
      },
      {
        heading: 'Por que tudo no navegador',
        body: 'As fotos são lidas na sua máquina e não sobem para servidor nenhum: não há conta, não há upload, não há banco de dados guardando o seu casamento. Fechar a aba é o bastante para não sobrar rastro. É também o que mantém o projeto de pé sem custo de infraestrutura.',
      },
      {
        heading: 'Em que ponto está',
        body: 'Fase 1: importar, ordenar, montar as páginas e baixar o álbum em ZIP ou PDF, tudo local. A Fase 2 prevista traz conta de usuário, álbuns salvos e link para compartilhar — sem mudar o que já funciona nem sair do free tier.',
      },
    ],
    stackKicker: 'Como foi feito',
    stackNote: 'Sete dependências de produção, fontes no repositório e um build que não precisa de rede.',
    authorKicker: 'Quem fez',
    authorTitle: 'Henrique',
    authorBody: 'Desenvolvedor. O Memento é um projeto pessoal, feito de ponta a ponta — do design system à exportação em PDF, escrita à mão sem biblioteca. Código aberto no GitHub; crítica, ideia ou bug, escreva.',
    backToAlbum: 'Montar meu álbum',
  },
  en: {
    kicker: 'About',
    title: 'An album is a choice, not a storage unit',
    lead: 'Memento started from a simple problem: the phone gallery keeps everything and tells you nothing. It reads the date and time written into each photo, gives back the sequence of what happened, and leaves the curation to the person who lived it.',
    sections: [
      {
        heading: 'Why no artificial intelligence',
        body: 'A machine-written caption describes what is in the image; it does not know why that afternoon mattered. Having the system write for you would trade the memory for a summary of it. Memento organizes the material and stops there — the meaning is the part only you have.',
      },
      {
        heading: 'Why it all runs in the browser',
        body: 'Photos are read on your machine and never uploaded: no account, no upload, no database holding your wedding. Closing the tab is enough to leave no trace. It is also what keeps the project alive with zero infrastructure cost.',
      },
      {
        heading: 'Where it stands',
        body: 'Phase 1: import, sort, build the pages and download the album as ZIP or PDF, all local. The planned Phase 2 adds user accounts, saved albums and a shareable link — without changing what already works or leaving the free tier.',
      },
    ],
    stackKicker: 'How it was built',
    stackNote: 'Seven production dependencies, fonts in the repository, and a build that needs no network.',
    authorKicker: 'Who built it',
    authorTitle: 'Henrique',
    authorBody: 'Developer. Memento is a personal project, built end to end — from the design system to the PDF export, hand-written with no library. Open source on GitHub; feedback, ideas or bugs, get in touch.',
    backToAlbum: 'Build my album',
  },
};
