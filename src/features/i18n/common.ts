/**
 * Textos que aparecem em mais de uma tela: barra de navegação, dicas
 * (tooltips), rodapé e o botão de montar o álbum.
 *
 * Landing e "Sobre" têm seus próprios arquivos de copy; o que é comum às duas
 * mora aqui para não ser escrito duas vezes com palavras diferentes.
 */

import type { Lang } from './lang';

export interface CommonCopy {
  cta: string;
  ctaAria: string;
  langAria: string;
  langTip: string;
  themeAria: string;
  themeTip: string;
  homeTip: string;
  navAlbum: string;
  navHow: string;
  navFeatures: string;
  navAbout: string;
  navHome: string;
  footerMadeBy: string;
  footerRole: string;
  footerNote: string;
  footerLinksLabel: string;
  tipGithub: string;
  tipLinkedin: string;
  tipEmail: string;
  tipRepo: string;
}

export const COMMON: Record<Lang, CommonCopy> = {
  pt: {
    cta: 'Montar meu álbum',
    ctaAria: 'Abrir o Memento e montar um álbum',
    langAria: 'Switch to English',
    langTip: 'Ver o site em inglês',
    themeAria: 'Alternar modo escuro',
    themeTip: 'Alternar claro e escuro',
    homeTip: 'Voltar ao início',
    navAlbum: 'O álbum',
    navHow: 'Como funciona',
    navFeatures: 'Recursos',
    navAbout: 'Sobre',
    navHome: 'Início',
    footerMadeBy: 'Feito por',
    footerRole: 'Desenvolvedor',
    footerNote: 'Memento — Guarde a memória. Em desenvolvimento, Fase 1.',
    footerLinksLabel: 'Contato e links',
    tipGithub: 'Perfil no GitHub',
    tipLinkedin: 'Perfil no LinkedIn',
    tipEmail: 'Enviar um email',
    tipRepo: 'Código-fonte do Memento',
  },
  en: {
    cta: 'Build my album',
    ctaAria: 'Open Memento and build an album',
    langAria: 'Mudar para português',
    langTip: 'View the site in Portuguese',
    themeAria: 'Toggle dark mode',
    themeTip: 'Switch light and dark',
    homeTip: 'Back to home',
    navAlbum: 'The album',
    navHow: 'How it works',
    navFeatures: 'Features',
    navAbout: 'About',
    navHome: 'Home',
    footerMadeBy: 'Built by',
    footerRole: 'Developer',
    footerNote: 'Memento — Keep the Memory. In development, Phase 1.',
    footerLinksLabel: 'Contact and links',
    tipGithub: 'GitHub profile',
    tipLinkedin: 'LinkedIn profile',
    tipEmail: 'Send an email',
    tipRepo: 'Memento source code',
  },
};
