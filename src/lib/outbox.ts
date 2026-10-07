import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { habitToRow } from './rows';
import type { Op } from './ops';

export type { Op };

/**
 * Cola de escrituras pendientes hacia Supabase.
 *
 * La UI aplica cada cambio al instante (optimista) y encola aquí la escritura.
 * La cola se guarda en AsyncStorage, se envía en orden y se reintenta con
 * espera exponencial si falla la red. Todas las operaciones son idempotentes,
 * así que repetir una no hace daño.
 */
export type OutboxStatus = { pending: number; error: string | null };

const KEY = 'habitat.outbox.v1';
const MAX_DELAY = 60_000;

let queue: Op[] = [];
let loaded = false;
let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let lastError: string | null = null;
const listeners = new Set<(s: OutboxStatus) => void>();

function emit() {
  const s = { pending: queue.length, error: lastError };
  listeners.forEach((l) => l(s));
}

export function subscribeOutbox(l: (s: OutboxStatus) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) queue = [...(JSON.parse(raw) as Op[]), ...queue];
  } catch {
    // Cola ilegible: se empieza vacía.
  }
}

async function save() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Si no se puede guardar, la cola sigue en memoria.
  }
}

async function send(op: Op): Promise<{ message: string; code?: string } | null> {
  switch (op.kind) {
    case 'upsertHabit': {
      const { error } = await supabase.from('habits').upsert(habitToRow(op.habit));
      return error;
    }
    case 'deleteHabit': {
      const { error } = await supabase.from('habits').delete().eq('id', op.id);
      return error;
    }
    case 'setLog': {
      // Desmarcar borra todos los registros del día, con o sin subtipo.
      const { error } = op.done
        ? await insertLog(op.habitId, op.day, null)
        : await supabase.from('habit_logs').delete().eq('habit_id', op.habitId).eq('day', op.day);
      return error;
    }
    case 'setSubtype': {
      const { error } = op.on
        ? await insertLog(op.habitId, op.day, op.subtypeId)
        : await supabase
            .from('habit_logs')
            .delete()
            .eq('habit_id', op.habitId)
            .eq('day', op.day)
            .eq('subtype_id', op.subtypeId);
      return error;
    }
  }
}

function insertLog(habitId: string, day: string, subtypeId: string | null) {
  return supabase
    .from('habit_logs')
    .upsert(
      { habit_id: habitId, day, subtype_id: subtypeId },
      { onConflict: 'habit_id,day,subtype_id', ignoreDuplicates: true },
    );
}

/** Errores de la BD (con código) no se arreglan reintentando; los de red sí. */
function isPermanent(error: { code?: string }): boolean {
  return Boolean(error.code);
}

/** Operaciones aún sin confirmar, para aplicarlas sobre los datos recién descargados. */
export async function pendingOps(): Promise<Op[]> {
  await load();
  return [...queue];
}

export async function enqueue(op: Op): Promise<void> {
  await load();
  queue.push(op);
  await save();
  emit();
  void flush();
}

/** Envía la cola en orden; si falla la red, programa un reintento. */
export async function flush(): Promise<void> {
  await load();
  if (flushing) return;
  flushing = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  try {
    while (queue.length > 0) {
      const op = queue[0]!;
      let error: { message: string; code?: string } | null;
      try {
        error = await send(op);
      } catch (e) {
        error = { message: e instanceof Error ? e.message : String(e) };
      }

      if (error && !isPermanent(error)) {
        lastError = 'Sin conexión. Los cambios se guardarán al recuperarla.';
        const delay = Math.min(MAX_DELAY, 1000 * 2 ** attempt++);
        retryTimer = setTimeout(() => void flush(), delay);
        emit();
        return;
      }

      // Enviada, o rechazada definitivamente: se quita de la cola.
      lastError = error ? `No se pudo guardar un cambio (${error.message}).` : null;
      attempt = 0;
      queue.shift();
      await save();
      emit();
    }
  } finally {
    flushing = false;
  }
}

/** Vacía la cola sin enviarla (al cambiar de usuario). */
export async function clearOutbox(): Promise<void> {
  queue = [];
  lastError = null;
  await save();
  emit();
}
