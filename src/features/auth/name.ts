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

/**
 * Teto do nome.
 *
 * Os formulários já param em 80 caracteres, mas `maxLength` é o navegador
 * pedindo por favor: `full_name` é metadado do usuário e qualquer um o escreve
 * direto pela API de auth com a chave publicável. Sem corte aqui, um nome de
 * dez mil caracteres entraria na barra de navegação e, pior, seria copiado
 * para `albums.author_name` na hora de salvar — onde a restrição de tamanho do
 * banco recusaria a linha e o álbum falharia depois das fotos já terem subido.
 * Cortar é sempre melhor do que recusar: o dado é decorativo.
 */
const MAX_NAME_LENGTH = 120;

export function nameOf(user: NamedUser): string {
  const raw = user.user_metadata?.full_name;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().slice(0, MAX_NAME_LENGTH);
  }
  // Sem nome, o pedaço antes do @ é o melhor apelido disponível — melhor do
  // que mostrar o e-mail inteiro numa barra de navegação estreita.
  return (user.email ?? '').split('@')[0]?.slice(0, MAX_NAME_LENGTH) ?? '';
}

/** Primeiro nome: cabe na barra e soa como conversa. */
export function firstNameOf(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
