/**
 * O contrato entre a tela de envio e o servidor: o teto de um envio e as
 * formas que atravessam a fronteira.
 *
 * Vive fora de `actions.ts` porque um módulo `'use server'` só pode exportar
 * funções `async` — uma `const` exportada ali derruba o build inteiro. Tipos
 * seriam apagados na compilação e passariam, mas ficam aqui junto com o teto
 * para que o contrato inteiro esteja em um lugar só.
 */

/** Quantas fotos um convidado manda de uma vez. */
export const MAX_PHOTOS_PER_SUBMISSION = 40;

export interface InviteTarget {
  albumId: string;
  /** Dona da pasta no Storage — é ela que compõe o caminho do arquivo. */
  ownerId: string;
  title: string;
  authorName: string;
}

export interface ContributionInput {
  id: string;
  storagePath: string;
  fileName: string;
  width: number;
  height: number;
  takenAt: string | null;
  timestampSource: 'exif' | 'file';
}
