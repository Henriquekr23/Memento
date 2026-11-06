/** Perguntas frequentes, nos dois idiomas. */

import type { Lang } from '@/features/i18n/lang';

export interface FaqItem {
  question: string;
  answer: string;
  /**
   * Marca as perguntas que aparecem no fim da landing. Lá o acordeão compete
   * com a decisão de começar: a lista inteira vira uma parede de texto e o
   * botão final some da tela. A bolha das telas internas continua mostrando
   * todas — quem a abre já está com uma dúvida específica na mão.
   */
  landing?: boolean;
}

export interface FaqCopy {
  openAria: string;
  closeAria: string;
  openTip: string;
  title: string;
  subtitle: string;
  items: FaqItem[];
  moreLabel: string;
}

/**
 * Atualizado na Fase 2. A ordem importa: as quatro primeiras respondem "para
 * onde vão minhas fotos", que é a dúvida que decide se a pessoa começa — e a
 * resposta mudou de "nunca saem" para "só saem se você pedir". Anunciar a
 * nuvem antes de deixar claro que ela é opcional trocaria a confiança que o
 * produto já tem por uma funcionalidade que nem todo mundo quer.
 */
export const FAQ: Record<Lang, FaqCopy> = {
  pt: {
    openAria: 'Abrir as perguntas frequentes',
    closeAria: 'Fechar as perguntas frequentes',
    openTip: 'Dúvidas? Perguntas frequentes',
    title: 'Perguntas frequentes',
    subtitle: 'O que costuma ser perguntado antes de começar.',
    items: [
      {
        question: 'Minhas fotos são enviadas para algum servidor?',
        landing: true,
        answer:
          'Só se você pedir. Montar o álbum e baixar o PDF acontece inteiro no seu navegador, sem conta e sem upload. As fotos só saem da sua máquina se você clicar em "Salvar na nuvem" — e aí sobe uma cópia, não o arquivo original.',
      },
      {
        question: 'Preciso criar conta?',
        landing: true,
        answer:
          'Não para usar. A conta serve para duas coisas: guardar o álbum para voltar depois e gerar um link para compartilhar. Sem conta, o Memento funciona como sempre funcionou — monte e baixe o PDF na mesma sessão.',
      },
      {
        question: 'O que exatamente é guardado quando eu salvo na nuvem?',
        answer:
          'Uma cópia de cada foto redimensionada para no máximo 2000 pixels, a ordem das páginas, o estilo, as legendas e os textos que você escreveu. A cópia é redesenhada do zero, então não leva os metadados do arquivo: a localização gravada pela câmera não sobe. A data fica guardada à parte e some junto com o álbum.',
      },
      {
        question: 'Isso piora a qualidade do meu álbum?',
        answer:
          'A do PDF não: ele continua sendo gerado do arquivo original, em resolução cheia, na sua máquina. O tamanho reduzido vale para a cópia que fica na nuvem e aparece no link compartilhado, onde 2000 pixels já cobrem qualquer tela.',
      },
      {
        question: 'Como funciona o link para compartilhar?',
        landing: true,
        answer:
          'Em "Meus álbuns", ligue a chave "Link público" e copie o endereço. Quem receber abre e folheia o álbum sem precisar de conta. Com a chave desligada, o álbum é só seu. Essas páginas ficam fora dos buscadores: quem tem o link entra, ninguém descobre por busca.',
      },
      {
        question: 'Como apago um álbum guardado?',
        answer:
          'Pelo botão "Apagar" em "Meus álbuns". Ele tira as fotos da nuvem e derruba o link compartilhado na hora. Os arquivos no seu computador não são tocados.',
      },
      {
        question: 'Dá para editar um álbum que já salvei?',
        answer:
          'Ainda não. O álbum guardado abre para leitura; para mudar a composição, o caminho é montar de novo e salvar. Reabrir para edição é o próximo passo.',
      },
      {
        question: 'Esqueci minha senha. E agora?',
        answer:
          'A recuperação automática ainda não está pronta. Sabendo a senha atual, dá para trocá-la em "Minha conta"; perdida de vez, fale com quem mantém o site.',
      },
      {
        question: 'O Memento usa inteligência artificial?',
        answer:
          'Não. Nenhuma legenda, título ou narrativa é gerada pelo sistema. Ele lê a data, a hora e as coordenadas gravadas em cada arquivo, ordena as fotos e deixa o resto para você.',
      },
      {
        question: 'E as fotos sem data no EXIF?',
        answer:
          'Entram pela data de modificação do arquivo e recebem um selo na grade, para você conferir se a posição ficou certa e mover à mão se não ficou.',
      },
      {
        question: 'Que formatos de imagem funcionam?',
        landing: true,
        answer:
          'JPEG, PNG, WebP, GIF e AVIF, até 80 MB por arquivo. HEIC do iPhone só abre se o próprio navegador souber decodificar — no Safari costuma funcionar; nos outros, converta para JPEG antes.',
      },
      {
        question: 'Como o álbum é baixado?',
        landing: true,
        answer:
          'Como um PDF de páginas, na ordem e na composição que você montou — o mesmo arquivo serve para mandar para alguém, guardar ou imprimir. Baixar não exige conta.',
      },
      {
        question: 'Quantas fotos aguenta de uma vez?',
        answer:
          'Depende da memória do seu dispositivo, não de um limite nosso. Algumas centenas costumam ir bem em um computador; no celular, prefira lotes menores.',
      },
      {
        question: 'É de graça? Tem pegadinha?',
        landing: true,
        answer:
          'De graça, com ou sem conta. O que roda no navegador não custa servidor, e a parte guardada na nuvem cabe no plano gratuito dos serviços que usamos. O código é aberto, dá para conferir.',
      },
    ],
    moreLabel: 'Ainda com dúvida? Leia a página Sobre',
  },
  en: {
    openAria: 'Open the frequently asked questions',
    closeAria: 'Close the frequently asked questions',
    openTip: 'Questions? Read the FAQ',
    title: 'Frequently asked questions',
    subtitle: 'What people usually ask before starting.',
    items: [
      {
        question: 'Are my photos uploaded to a server?',
        landing: true,
        answer:
          'Only if you ask. Building the album and downloading the PDF happens entirely in your browser, with no account and no upload. Photos leave your machine only when you click "Save to the cloud" — and what goes up is a copy, not your original file.',
      },
      {
        question: 'Do I need an account?',
        landing: true,
        answer:
          'Not to use it. The account does two things: it keeps the album so you can come back, and it creates a link to share. Without one, Memento works exactly as it always did — build and download the PDF in the same session.',
      },
      {
        question: 'What exactly is stored when I save to the cloud?',
        answer:
          'A copy of each photo resized to at most 2000 pixels, the page order, the style, the captions and the text you wrote. The copy is redrawn from scratch, so it carries no file metadata: the location your camera recorded does not go up. The date is stored separately and goes away with the album.',
      },
      {
        question: 'Does that hurt the quality of my album?',
        answer:
          'Not the PDF: it is still generated from your original file, at full resolution, on your machine. The smaller size applies to the copy that lives in the cloud and shows up in the shared link, where 2000 pixels already cover any screen.',
      },
      {
        question: 'How does the shareable link work?',
        landing: true,
        answer:
          'Under "My albums", flip the "Public link" switch and copy the address. Whoever gets it can open and page through the album with no account. With the switch off, the album is yours alone. These pages stay out of search engines: having the link is the way in.',
      },
      {
        question: 'How do I delete a saved album?',
        answer:
          'With the "Delete" button under "My albums". It removes the photos from the cloud and kills the shared link right away. The files on your computer are untouched.',
      },
      {
        question: 'Can I edit an album I already saved?',
        answer:
          'Not yet. A saved album opens for reading; to change the composition, build it again and save. Reopening for editing is the next step.',
      },
      {
        question: 'I forgot my password. Now what?',
        answer:
          'Automatic recovery is not ready yet. If you know your current password you can change it under "My account"; if it is truly lost, contact whoever runs the site.',
      },
      {
        question: 'Does Memento use artificial intelligence?',
        answer:
          'No. No caption, title or narrative is generated by the system. It reads the date, time and coordinates written into each file, sorts the photos and leaves the rest to you.',
      },
      {
        question: 'What about photos with no EXIF date?',
        answer:
          'They come in by file modification date and get a badge in the grid, so you can check whether the position looks right and move them by hand if it does not.',
      },
      {
        question: 'Which image formats work?',
        landing: true,
        answer:
          'JPEG, PNG, WebP, GIF and AVIF, up to 80 MB per file. iPhone HEIC only opens if the browser itself can decode it — Safari usually can; elsewhere, convert to JPEG first.',
      },
      {
        question: 'How is the album downloaded?',
        landing: true,
        answer:
          'As a paged PDF, in the order and composition you built — the same file works to send to someone, to keep or to print. Downloading needs no account.',
      },
      {
        question: 'How many photos can it handle at once?',
        answer:
          'It depends on your device memory, not on a limit we set. A few hundred usually go fine on a computer; on a phone, prefer smaller batches.',
      },
      {
        question: 'Is it free? What is the catch?',
        landing: true,
        answer:
          'Free, with or without an account. What runs in the browser costs no server, and the part kept in the cloud fits the free plan of the services we use. The code is open, so you can check.',
      },
    ],
    moreLabel: 'Still unsure? Read the About page',
  },
};
