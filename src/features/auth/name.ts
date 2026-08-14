/**
 * Como o sistema chama a pessoa.
 *
 * Módulo sem `'use client'` de propósito: o nome é lido tanto no servidor (a
 * tela de conta, a lista de álbuns) quanto no navegador (a barra do topo), e
 * um arquivo marcado como cliente não pode ser chamado dos dois lados.
 */

export interface NamedUser {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export function nameOf(user: NamedUser): string {
  const raw = user.user_metadata?.full_name;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  // Sem nome, o pedaço antes do @ é o melhor apelido disponível — melhor do
  // que mostrar o e-mail inteiro numa barra de navegação estreita.
  return (user.email ?? '').split('@')[0] ?? '';
}

/** Primeiro nome: cabe na barra e soa como conversa. */
export function firstNameOf(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
