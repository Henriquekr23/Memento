/** Textos da página de agradecimento. */

import type { Lang } from '@/features/i18n/lang';

export interface ThankYouCopy {
  kicker: string;
  /** Título quando o download acabou de acontecer. */
  title: string;
  /** Título quando a pessoa chegou aqui sem baixar nada. */
  titleGeneric: string;
  lead: string;
  leadGeneric: string;
  /** `{photos}` e `{pages}` são trocados pelas contagens. */
  summary: string;
  checkFile: string;
  cardLabel: string;
  cardHint: string;
  downloadCard: string;
  nextKicker: string;
  next: { title: string; body: string }[];
  again: string;
  home: string;
}

export const THANK_YOU: Record<Lang, ThankYouCopy> = {
  pt: {
    kicker: 'Obrigado',
    title: 'Seu álbum está no seu computador',
    titleGeneric: 'Obrigado por usar o Memento',
    lead: 'O download começou — se não apareceu, olhe a pasta de downloads do navegador. O arquivo é seu: nenhuma cópia ficou aqui, e nada foi enviado para servidor nenhum.',
    leadGeneric:
      'Esta página aparece depois que um álbum é baixado. Se você chegou direto, o caminho é o contrário: monte o álbum primeiro.',
    summary: '{photos} em {pages}, na ordem em que aconteceu.',
    checkFile: 'Confira o arquivo agora: nesta fase o álbum montado não fica salvo, então qualquer mudança pede montar de novo.',
    cardLabel: 'O cartão do seu álbum',
    cardHint:
      'Uma imagem 1200×630 com a capa e as contagens, do tamanho certo para post. Ela é gerada na sua máquina e só sai daqui se você mandar.',
    downloadCard: 'Baixar o cartão',
    nextKicker: 'E agora',
    next: [
      {
        title: 'Guarde em dois lugares',
        body: 'PDF é um arquivo como qualquer outro: uma cópia na nuvem e outra no computador é o que separa a memória guardada da memória perdida com o aparelho.',
      },
      {
        title: 'Imprima se for para durar',
        body: 'As páginas saem em proporção de impressão. Uma gráfica online encaderna por pouco, e álbum de papel não depende de bateria nem de formato de arquivo.',
      },
      {
        title: 'Monte o próximo',
        body: 'A viagem seguinte, o aniversário, o ano inteiro em doze fotos. O Memento não guarda nada — cada álbum começa da estaca zero, e isso é de propósito.',
      },
    ],
    again: 'Montar outro álbum',
    home: 'Voltar ao início',
  },
  en: {
    kicker: 'Thank you',
    title: 'Your album is on your computer',
    titleGeneric: 'Thank you for using Memento',
    lead: 'The download has started — if you cannot see it, check your browser downloads folder. The file is yours: no copy stayed here, and nothing was sent to any server.',
    leadGeneric:
      'This page shows up after an album is downloaded. If you landed here directly, the order is the other way around: build the album first.',
    summary: '{photos} across {pages}, in the order it happened.',
    checkFile: 'Check the file now: in this phase the built album is not saved, so any change means building it again.',
    cardLabel: 'Your album card',
    cardHint:
      'A 1200×630 image with the cover and the counts, the right size for a post. It is generated on your machine and only leaves here if you send it.',
    downloadCard: 'Download the card',
    nextKicker: 'What now',
    next: [
      {
        title: 'Keep it in two places',
        body: 'A PDF is a file like any other: one copy in the cloud and one on the computer is what separates a kept memory from one lost with the device.',
      },
      {
        title: 'Print it if it should last',
        body: 'The pages come in print proportions. An online print shop binds it for little, and a paper album depends on no battery and no file format.',
      },
      {
        title: 'Build the next one',
        body: 'The next trip, the birthday, a whole year in twelve photos. Memento keeps nothing — every album starts from scratch, and that is on purpose.',
      },
    ],
    again: 'Build another album',
    home: 'Back to home',
  },
};
