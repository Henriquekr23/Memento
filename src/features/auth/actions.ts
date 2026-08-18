'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { safeNext } from '@/lib/safeNext';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { AuthFormState } from './state';

/**
 * Conta e sessão. O mínimo que existe: nome, e-mail e senha, sem provedor
 * social e sem tabela de perfil — o nome mora no `user_metadata` do próprio
 * Supabase Auth. Uma tabela `profiles` só para guardar uma string custaria
 * migração, RLS e uma consulta a mais em toda tela.
 *
 * A conta não é a porta de entrada do produto: montar o álbum e baixar o PDF
 * continua funcionando sem ela. Entrar só é exigido para guardar o álbum na
 * nuvem — por isso todo formulário carrega para onde voltar depois (`next`).
 */

const fail = (error: string): AuthFormState => ({ error, notice: null });

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    name: String(formData.get('name') ?? '').trim().slice(0, 80),
    next: safeNext(formData.get('next')),
  };
}

/** Mensagens do Supabase são em inglês e técnicas demais para a tela. */
function translate(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme o e-mail antes de entrar — o link está na sua caixa de entrada.';
  }
  if (lower.includes('user already registered')) {
    return 'Já existe uma conta com este e-mail. Tente entrar.';
  }
  if (lower.includes('password should be')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (lower.includes('same as the old') || lower.includes('should be different')) {
    return 'A senha nova precisa ser diferente da atual.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  return 'Não foi possível concluir. Tente de novo em instantes.';
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return fail('Preencha e-mail e senha.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(translate(error.message));

  revalidatePath('/', 'layout');
  // `redirect` lança por dentro: precisa ficar fora de try/catch.
  redirect(next);
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, name, next } = readCredentials(formData);
  if (!name) return fail('Diga como devemos chamar você.');
  if (!email || !password) return fail('Preencha e-mail e senha.');
  if (password.length < 6) {
    return fail('A senha precisa ter pelo menos 6 caracteres.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // `full_name` é a convenção que os provedores sociais do Supabase também
    // usam — se um dia entrar login com Google, o nome cai no mesmo lugar.
    options: { data: { full_name: name } },
  });
  if (error) return fail(translate(error.message));

  // Com confirmação de e-mail ligada no painel, não há sessão ainda: avisar é
  // melhor do que redirecionar para uma tela que vai pedir login de novo.
  if (!data.session) {
    return {
      error: null,
      notice:
        'Conta criada. Confirme o e-mail pelo link que enviamos e depois entre.',
    };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Trocar o nome exibido. */
export async function updateNameAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  if (!name) return fail('O nome não pode ficar em branco.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return fail(translate(error.message));

  revalidatePath('/', 'layout');
  return { error: null, notice: 'Nome atualizado.' };
}

/**
 * Trocar a senha.
 *
 * O Supabase permite `updateUser({ password })` só com a sessão válida, sem
 * pedir a senha atual. Aqui ela é pedida e conferida antes: uma sessão
 * esquecida aberta num computador emprestado não pode virar uma troca de senha
 * — isso trancaria o dono para fora da própria conta.
 */
export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const current = String(formData.get('currentPassword') ?? '');
  const next = String(formData.get('newPassword') ?? '');
  const confirmation = String(formData.get('confirmPassword') ?? '');

  if (!current || !next) return fail('Preencha a senha atual e a nova.');
  if (next.length < 6) return fail('A senha nova precisa ter pelo menos 6 caracteres.');
  if (next !== confirmation) return fail('A confirmação não bate com a senha nova.');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail('Sua sessão expirou. Entre de novo.');

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (checkError) return fail('A senha atual está incorreta.');

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return fail(translate(error.message));

  return { error: null, notice: 'Senha alterada.' };
}
