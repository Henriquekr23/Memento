/**
 * Estado dos formulários de conta.
 *
 * Mora fora de `actions.ts` porque um arquivo `'use server'` só pode exportar
 * funções assíncronas — qualquer constante ali vira erro de build.
 */

export interface AuthFormState {
  error: string | null;
  /** Recado que não é falha — hoje só "confirme seu e-mail". */
  notice: string | null;
}

export const EMPTY_AUTH_STATE: AuthFormState = { error: null, notice: null };
