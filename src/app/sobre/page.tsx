import type { Metadata } from 'next';

import { AboutPage } from '@/features/about/AboutPage';

export const metadata: Metadata = {
  title: 'Sobre — Memento',
  description:
    'O que é o Memento, por que ele não usa inteligência artificial e por que tudo roda no seu navegador. Projeto pessoal de Henrique, código aberto no GitHub.',
};

export default function Sobre() {
  return <AboutPage />;
}
