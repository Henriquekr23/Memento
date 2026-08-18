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
        body: 'As fotos são lidas na sua máquina e nada é enviado sem um pedido explícito seu: sem conta, sem upload, sem banco de dados guardando o seu casamento. Quem quiser guardar o álbum e compartilhar por link cria uma conta e clica em salvar — e mesmo aí sobe uma cópia reduzida, sem os metadados do arquivo, que você apaga quando quiser. É esse limite que mantém o projeto de pé sem custo de infraestrutura.',
      },
      {
        heading: 'Em que ponto está',
        body: 'Fase 1, pronta: importar, ordenar, montar as páginas e baixar o álbum em PDF, tudo local. Fase 2, em uso agora: conta opcional, álbum guardado e link público para compartilhar — sem mudar o que já funcionava e sem sair do free tier. A seguir: reabrir um álbum salvo para editar.',
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
        body: 'Photos are read on your machine and nothing is sent without you asking for it: no account, no upload, no database holding your wedding. Anyone who wants to keep an album and share it by link creates an account and hits save — and even then what goes up is a reduced copy, stripped of file metadata, that you can delete whenever you like. That boundary is what keeps the project alive with zero infrastructure cost.',
      },
      {
        heading: 'Where it stands',
        body: 'Phase 1, done: import, sort, build the pages and download the album as a PDF, all local. Phase 2, live now: optional account, saved albums and a public link to share — without changing what already worked or leaving the free tier. Next: reopening a saved album to edit it.',
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
