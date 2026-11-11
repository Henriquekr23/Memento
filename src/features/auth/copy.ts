/**
 * Textos da tela /entrar (entrar e criar conta), em pt e en.
 *
 * As mensagens de erro vêm das server actions (`actions.ts`) e continuam em
 * português por enquanto — elas são escritas no servidor, que não conhece o
 * idioma escolhido no navegador.
 */

import type { Lang } from '@/features/i18n/lang';

import type { AuthMode } from './AuthForm';

interface ModeCopy {
  title: string;
  lead: string;
  submit: string;
  busy: string;
}

export interface AuthCopy {
  modes: Record<AuthMode, ModeCopy>;
  switchLabel: string;
  tabSignIn: string;
  tabSignUp: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordHint: string;
  showPassword: string;
  noAccountTitle: string;
  noAccountText: string;
  noAccountLink: string;
  disabledTitle: string;
  disabledText: string;
  disabledLink: string;
}

const pt: AuthCopy = {
  modes: {
    signin: {
      title: 'Bem-vindo de volta.',
      lead: 'Entre para ver seus álbuns guardados e o link de cada um.',
      submit: 'Entrar',
      busy: 'Entrando…',
    },
    signup: {
      title: 'Crie sua conta.',
      lead: 'A conta guarda os álbuns na nuvem e gera o link para compartilhar.',
      submit: 'Criar conta',
      busy: 'Criando…',
    },
  },
  switchLabel: 'Entrar ou criar conta',
  tabSignIn: 'Entrar',
  tabSignUp: 'Criar conta',
  name: 'Como podemos chamar você?',
  namePlaceholder: 'Seu nome',
  email: 'E-mail',
  emailPlaceholder: 'voce@email.com',
  password: 'Senha',
  passwordHint: 'Pelo menos 6 caracteres.',
  showPassword: 'Mostrar a senha',
  noAccountTitle: 'Sem conta também funciona.',
  noAccountText: 'Montar o álbum e baixar o PDF não pedem cadastro — as fotos nem saem do seu aparelho.',
  noAccountLink: 'Montar sem conta',
  disabledTitle: 'Contas desligadas.',
  disabledText:
    'As contas não estão configuradas nesta instalação. O álbum continua funcionando por completo, sem conta.',
  disabledLink: 'Montar um álbum',
};

const en: AuthCopy = {
  modes: {
    signin: {
      title: 'Welcome back.',
      lead: 'Sign in to see your saved albums and the link to each one.',
      submit: 'Sign in',
      busy: 'Signing in…',
    },
    signup: {
      title: 'Create your account.',
      lead: 'An account keeps your albums in the cloud and makes a link to share.',
      submit: 'Create account',
      busy: 'Creating…',
    },
  },
  switchLabel: 'Sign in or create an account',
  tabSignIn: 'Sign in',
  tabSignUp: 'Create account',
  name: 'What should we call you?',
  namePlaceholder: 'Your name',
  email: 'Email',
  emailPlaceholder: 'you@email.com',
  password: 'Password',
  passwordHint: 'At least 6 characters.',
  showPassword: 'Show password',
  noAccountTitle: 'No account works too.',
  noAccountText:
    "Building the album and downloading the PDF don't need sign-up — your photos never leave your device.",
  noAccountLink: 'Build without an account',
  disabledTitle: 'Accounts are off.',
  disabledText:
    "Accounts aren't set up on this install. The album still works in full, no account needed.",
  disabledLink: 'Build an album',
};

export const AUTH_COPY: Record<Lang, AuthCopy> = { pt, en };
