import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import type { DayKey, Habit } from '@/types';
import { toKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { applyOp, type HabitsData, type Op } from '@/lib/ops';
import { withStartOn } from '@/lib/grid';
import { habitFromRow, type HabitRow, type LogRow } from '@/lib/rows';
import type { SubtypeLogs } from '@/lib/subtypes';
import { cancelAllReminders, syncReminders } from '@/lib/notifications';
import { clearOutbox, enqueue, flush, pendingOps, subscribeOutbox, type OutboxStatus } from '@/lib/outbox';

/** Campos editables de un hábito (lo demás lo pone el store). */
export type HabitInput = Omit<Habit, 'id' | 'createdOn'>;

export type AccountInfo = { id: string; email: string | null };

type HabitsState = HabitsData & {
  /** Estado de la carga inicial. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  /** Escrituras pendientes de enviar y último error de sincronización. */
  sync: OutboxStatus;
  /** `undefined` mientras se comprueba si hay sesión guardada. */
  account: AccountInfo | null | undefined;

  /** Arranca la escucha de sesión y sincronización. Idempotente. */
  init: () => Promise<void>;
  /** Vuelve a descargar los datos del usuario actual. */
  reload: () => Promise<void>;

  /** Marca o desmarca `day` para el hábito (desmarcar quita también sus subtipos). */
  toggleLog: (habitId: string, day: DayKey) => void;
  /** Marca o quita un subtipo en `day`. Quitar el último desmarca el día. */
  toggleSubtype: (habitId: string, day: DayKey, subtypeId: string) => void;
  /** Crea un hábito con `created_on` = hoy y devuelve su id. */
  addHabit: (input: HabitInput) => string;
  updateHabit: (id: string, input: HabitInput) => void;
  deleteHabit: (id: string) => void;
};

const PAGE = 1000;

async function fetchAll(): Promise<HabitsData> {
  const { data: rows, error } = await supabase
    .from('habits')
    .select('*')
    .is('archived_at', null)
    .order('created_at');
  if (error) throw error;

  const habits = (rows as HabitRow[]).map(habitFromRow);
  const logs: Record<string, Set<DayKey>> = Object.fromEntries(habits.map((h) => [h.id, new Set<DayKey>()]));
  const subtypeLogs: Record<string, SubtypeLogs> = Object.fromEntries(habits.map((h) => [h.id, {}]));

  // Supabase devuelve como mucho 1000 filas por consulta: se pagina.
  for (let from = 0; ; from += PAGE) {
    const { data, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, day, subtype_id')
      .order('id')
      .range(from, from + PAGE - 1);
    if (logsError) throw logsError;
    for (const { habit_id, day, subtype_id } of data as LogRow[]) {
      logs[habit_id]?.add(day);
      const tags = subtypeLogs[habit_id];
      if (tags && subtype_id) (tags[day] ??= []).push(subtype_id);
    }
    if (data.length < PAGE) break;
  }

  return { habits, logs, subtypeLogs };
}

function accountFrom(user: { id: string; email?: string } | null): AccountInfo | null {
  return user ? { id: user.id, email: user.email || null } : null;
}

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

let initialized = false;
let loadSeq = 0;
/** Usuario cuyos datos hay cargados. */
let dataUserId: string | null = null;

export const useHabits = create<HabitsState>()((set, get) => {
  /** Aplica en local al instante y encola la escritura (actualización optimista). */
  const commit = (op: Op) => {
    set((s) => applyOp(s, op));
    void enqueue(op);
    if (op.kind === 'upsertHabit' || op.kind === 'deleteHabit') void syncReminders(get().habits);
  };

  /** Antes de marcar un día anterior al inicio, adelanta `created_on` a ese día. */
  const extendStart = (habitId: string, day: DayKey) => {
    const current = get().habits.find((h) => h.id === habitId);
    const habit = current && withStartOn(current, day);
    if (habit) commit({ kind: 'upsertHabit', habit });
  };

  return {
    habits: [],
    logs: {},
    subtypeLogs: {},
    status: 'idle',
    loadError: null,
    sync: { pending: 0, error: null },
    account: undefined,

    init: async () => {
      if (initialized) return;
      initialized = true;

      subscribeOutbox((sync) => set({ sync }));

      // Se dispara al suscribirse (INITIAL_SESSION) y en cada entrada o salida.
      supabase.auth.onAuthStateChange((_event, session) => {
        const account = accountFrom(session?.user ?? null);
        set({ account });
        if (account?.id === dataUserId) return;

        const switching = dataUserId !== null;
        dataUserId = account?.id ?? null;
        if (!account) {
          loadSeq++;
          set({ habits: [], logs: {}, subtypeLogs: {}, status: 'idle', loadError: null });
          void clearOutbox();
          void cancelAllReminders();
          return;
        }
        // setTimeout: Supabase desaconseja llamarle dentro de este callback.
        setTimeout(() => {
          void (switching ? clearOutbox() : Promise.resolve()).then(() => get().reload());
        }, 0);
      });
    },

    reload: async () => {
      if (!get().account) return;
      const seq = ++loadSeq;
      set({ status: 'loading', loadError: null });
      try {
        let data = await fetchAll();
        // Cambios hechos en este dispositivo que aún no han llegado al servidor.
        for (const op of await pendingOps()) data = applyOp(data, op);
        if (seq !== loadSeq) return;
        set({ ...data, status: 'ready' });
        void flush();
        // Reprograma según los datos del servidor (cambios hechos en otro dispositivo).
        void syncReminders(data.habits);
      } catch (e) {
        if (seq !== loadSeq) return;
        set({ status: 'error', loadError: messageOf(e) });
      }
    },

    toggleLog: (habitId, day) => {
      const done = !get().logs[habitId]?.has(day);
      if (done) extendStart(habitId, day);
      commit({ kind: 'setLog', habitId, day, done });
    },

    toggleSubtype: (habitId, day, subtypeId) => {
      const marked = get().subtypeLogs[habitId]?.[day] ?? [];
      if (!marked.includes(subtypeId)) {
        extendStart(habitId, day);
        commit({ kind: 'setSubtype', habitId, day, subtypeId, on: true });
      } else if (marked.length === 1) {
        // Era el último: el día deja de estar hecho (borra también un posible registro sin subtipo).
        commit({ kind: 'setLog', habitId, day, done: false });
      } else {
        commit({ kind: 'setSubtype', habitId, day, subtypeId, on: false });
      }
    },

    addHabit: (input) => {
      const habit: Habit = { ...input, id: randomUUID(), createdOn: toKey(new Date()) };
      commit({ kind: 'upsertHabit', habit });
      return habit.id;
    },

    updateHabit: (id, input) => {
      const current = get().habits.find((h) => h.id === id);
      if (current) commit({ kind: 'upsertHabit', habit: { ...current, ...input } });
    },

    deleteHabit: (id) => commit({ kind: 'deleteHabit', id }),
  };
});
