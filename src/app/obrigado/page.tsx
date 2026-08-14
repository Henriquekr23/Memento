import type { Metadata } from 'next';

import { ThankYouPage } from '@/features/thank-you/ThankYouPage';

export const metadata: Metadata = {
  title: 'Obrigado — Memento',
  description:
    'Seu álbum foi baixado. Guarde o arquivo, compartilhe o cartão se quiser e monte o próximo quando a próxima viagem pedir.',
  // Página de fim de fluxo: não é porta de entrada e não deve competir nos
  // resultados de busca com a landing.
  robots: { index: false, follow: true },
};

export default function Obrigado() {
  return <ThankYouPage />;
}
