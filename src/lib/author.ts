/**
 * Quem fez o Memento. Um lugar só, porque o rodapé, a página "Sobre" e os
 * metadados do site repetiriam os mesmos dados — e três cópias divergem.
 */

export const AUTHOR = {
  name: 'Henrique',
  role: { pt: 'Desenvolvedor', en: 'Developer' },
  email: 'henriquekr23@gmail.com',
  github: 'https://github.com/Henriquekr23',
  repo: 'https://github.com/Henriquekr23/Memento',
  linkedin: 'https://www.linkedin.com/in/henriquekummel/',
} as const;

/** Rótulo curto de cada link, para o rodapé e para o `aria-label`. */
export const AUTHOR_LINKS = [
  { id: 'github', label: 'GitHub', href: AUTHOR.github },
  { id: 'linkedin', label: 'LinkedIn', href: AUTHOR.linkedin },
  { id: 'email', label: AUTHOR.email, href: `mailto:${AUTHOR.email}` },
] as const;
