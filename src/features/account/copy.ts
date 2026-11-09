/**
 * Textos das telas da conta ("Meus álbuns" e "Minha conta") e das peças que
 * elas usam (cartão do álbum, link público, formulários), em pt e en.
 *
 * As páginas são server components e o idioma mora no navegador
 * (localStorage), então o texto não pode ser escrito na página: ele é lido
 * daqui por componentes client (`AccountTexts.tsx`, `AlbumCard`,
 * `AccountForms`, `ShareControls`). Sem isso o botão de idioma trocava só o
 * topo e o rodapé.
 */

import type { Lang } from '@/features/i18n/lang';

export interface AccountCopy {
  locale: string;
  tabsLabel: string;
  tabAlbums: string;
  tabAccount: string;

  // Meus álbuns
  albumsTitle: string;
  albumsLeadEmpty: (firstName: string) => string;
  albumsLeadCount: (n: number) => string;
  newAlbum: string;
  emptyTitle: string;
  emptyTextBefore: string;
  emptyTextStrong: string;
  emptyTextAfter: string;
  sharedTitle: string;
  sharedHelp: string;

  // Cartão do álbum
  open: string;
  openAria: (title: string) => string;
  edit: string;
  remove: string;
  removeAria: (title: string) => string;
  removeTitle: (title: string) => string;
  removeDescription: string;
  cancel: string;
  photos: (n: number) => string;
  finished: string;
  invited: string;

  // Link público
  publicLink: string;
  publicOnInline: string;
  publicOffInline: string;
  publicOnRow: string;
  publicOffRow: string;
  copyLink: string;
  copied: string;
  linkCopied: string;
  copyFailed: string;
  address: string;

  // Minha conta
  accountTitle: string;
  accountLead: string;
  signOut: string;
  signOutHint: string;
  dataTitle: string;
  dataHint: string;
  name: string;
  email: string;
  emailHint: string;
  saveName: string;
  saving: string;
  passwordTitle: string;
  passwordHint: string;
  currentPassword: string;
  newPassword: string;
  missingChars: (n: number) => string;
  minChars: (n: number) => string;
  repeatPassword: string;
  mismatch: string;
  match: string;
  showPasswords: string;
  changePassword: string;
  changing: string;
}

const pt: AccountCopy = {
  locale: 'pt-BR',
  tabsLabel: 'Conta',
  tabAlbums: 'Meus álbuns',
  tabAccount: 'Minha conta',

  albumsTitle: 'Seus álbuns.',
  albumsLeadEmpty: (firstName) => `Nada guardado ainda, ${firstName}.`,
  albumsLeadCount: (n) =>
    `${n} ${n === 1 ? 'álbum guardado' : 'álbuns guardados'} na nuvem.`,
  newAlbum: 'Montar um álbum',
  emptyTitle: 'Seu primeiro álbum aparece aqui.',
  emptyTextBefore: 'Monte o álbum e, na última etapa, use ',
  emptyTextStrong: 'Salvar na nuvem',
  emptyTextAfter:
    '. Ele fica guardado nesta lista, com um link para compartilhar quando você quiser.',
  sharedTitle: 'Montando com outras pessoas',
  sharedHelp:
    'Álbuns em que você foi convidado a montar. Quem compartilha e quem apaga é quem começou o álbum.',

  open: 'Abrir',
  openAria: (title) => `Abrir ${title}`,
  edit: 'Editar',
  remove: 'Apagar',
  removeAria: (title) => `Apagar ${title}`,
  removeTitle: (title) => `Apagar "${title}"?`,
  removeDescription:
    'As fotos guardadas na nuvem e o link compartilhado somem para sempre. Os arquivos no seu computador continuam intactos.',
  cancel: 'Cancelar',
  photos: (n) => (n === 1 ? '1 foto' : `${n} fotos`),
  finished: 'Finalizado',
  invited: 'Convidado',

  publicLink: 'Link público',
  publicOnInline: 'Quem tiver o link abre o álbum.',
  publicOffInline: 'Só você vê este álbum.',
  publicOnRow:
    'Quem tiver o link folheia o álbum, sem precisar de conta. Ninguém encontra o álbum por busca.',
  publicOffRow: 'Desligado: só você e quem monta junto veem o álbum.',
  copyLink: 'Copiar link',
  copied: 'Copiado',
  linkCopied: 'Link copiado',
  copyFailed: 'O navegador não deixou copiar. Copie da barra de endereços.',
  address: 'Endereço',

  accountTitle: 'Sua conta.',
  accountLead: 'Seu nome, sua senha e a saída — tudo aqui.',
  signOut: 'Sair da conta',
  signOutHint: 'Encerra a sessão neste navegador. Seus álbuns guardados continuam onde estão.',
  dataTitle: 'Seus dados',
  dataHint: 'O nome aparece no topo, na sua lista e no álbum que você compartilha.',
  name: 'Nome',
  email: 'E-mail',
  emailHint: 'É o seu login. Trocar o e-mail ainda não está pronto.',
  saveName: 'Salvar nome',
  saving: 'Salvando…',
  passwordTitle: 'Senha',
  passwordHint:
    'A senha atual é pedida porque uma sessão esquecida aberta não pode virar uma troca de senha.',
  currentPassword: 'Senha atual',
  newPassword: 'Senha nova',
  missingChars: (n) => `Faltam ${n} ${n === 1 ? 'caractere' : 'caracteres'}.`,
  minChars: (n) => `Pelo menos ${n} caracteres.`,
  repeatPassword: 'Repita a senha nova',
  mismatch: 'Ainda não é igual à senha nova.',
  match: 'As duas batem.',
  showPasswords: 'Mostrar as senhas',
  changePassword: 'Alterar senha',
  changing: 'Alterando…',
};

const en: AccountCopy = {
  locale: 'en-US',
  tabsLabel: 'Account',
  tabAlbums: 'My albums',
  tabAccount: 'My account',

  albumsTitle: 'Your albums.',
  albumsLeadEmpty: (firstName) => `Nothing saved yet, ${firstName}.`,
  albumsLeadCount: (n) => `${n} ${n === 1 ? 'album' : 'albums'} saved in the cloud.`,
  newAlbum: 'Build an album',
  emptyTitle: 'Your first album shows up here.',
  emptyTextBefore: 'Build the album and, in the last step, use ',
  emptyTextStrong: 'Save to the cloud',
  emptyTextAfter: '. It stays in this list, with a link to share whenever you want.',
  sharedTitle: 'Building with others',
  sharedHelp:
    'Albums you were invited to build. Sharing and deleting are up to whoever started the album.',

  open: 'Open',
  openAria: (title) => `Open ${title}`,
  edit: 'Edit',
  remove: 'Delete',
  removeAria: (title) => `Delete ${title}`,
  removeTitle: (title) => `Delete "${title}"?`,
  removeDescription:
    'The photos saved in the cloud and the shared link are gone for good. The files on your computer stay untouched.',
  cancel: 'Cancel',
  photos: (n) => (n === 1 ? '1 photo' : `${n} photos`),
  finished: 'Finished',
  invited: 'Invited',

  publicLink: 'Public link',
  publicOnInline: 'Anyone with the link can open the album.',
  publicOffInline: 'Only you can see this album.',
  publicOnRow:
    'Anyone with the link can flip through the album, no account needed. Nobody finds it by searching.',
  publicOffRow: 'Off: only you and the people building with you can see the album.',
  copyLink: 'Copy link',
  copied: 'Copied',
  linkCopied: 'Link copied',
  copyFailed: "The browser didn't allow copying. Copy it from the address bar.",
  address: 'Address',

  accountTitle: 'Your account.',
  accountLead: 'Your name, your password and signing out — all here.',
  signOut: 'Sign out',
  signOutHint: 'Ends the session in this browser. Your saved albums stay where they are.',
  dataTitle: 'Your details',
  dataHint: 'Your name shows at the top, in your list and on the albums you share.',
  name: 'Name',
  email: 'Email',
  emailHint: "It's your login. Changing the email isn't ready yet.",
  saveName: 'Save name',
  saving: 'Saving…',
  passwordTitle: 'Password',
  passwordHint:
    'We ask for the current password so a session left open can’t be used to change it.',
  currentPassword: 'Current password',
  newPassword: 'New password',
  missingChars: (n) => `${n} more ${n === 1 ? 'character' : 'characters'} to go.`,
  minChars: (n) => `At least ${n} characters.`,
  repeatPassword: 'Repeat the new password',
  mismatch: "Doesn't match the new password yet.",
  match: 'Both match.',
  showPasswords: 'Show passwords',
  changePassword: 'Change password',
  changing: 'Changing…',
};

export const ACCOUNT_COPY: Record<Lang, AccountCopy> = { pt, en };
