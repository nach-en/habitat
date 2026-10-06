import { supabase } from './supabase';

// Autenticación con email y contraseña (mismo esquema que Viborapp).

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Crea la cuenta. Devuelve `true` si hay que confirmar el email antes de
 * entrar (opción "Confirm email" de Supabase activada).
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return !data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
