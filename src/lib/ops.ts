import type { DayKey, Habit } from '@/types';
import type { SubtypeLogs } from './subtypes';

/** Cambio sobre los datos del usuario: se aplica en local y se envía a Supabase. */
export type Op =
  | { kind: 'upsertHabit'; habit: Habit }
  | { kind: 'deleteHabit'; id: string }
  /** Marca el día como hecho (sin subtipo) o lo desmarca entero, con sus subtipos. */
  | { kind: 'setLog'; habitId: string; day: DayKey; done: boolean }
  /** Marca o quita un subtipo del día. Marcarlo marca el día como hecho. */
  | { kind: 'setSubtype'; habitId: string; day: DayKey; subtypeId: string; on: boolean };

export type HabitsData = {
  habits: Habit[];
  /** habitId → días hechos. */
  logs: Record<string, Set<DayKey>>;
  /** habitId → subtipos marcados por día. */
  subtypeLogs: Record<string, SubtypeLogs>;
};

/** Aplica `op` sobre `data` sin mutarlo. */
export function applyOp(data: HabitsData, op: Op): HabitsData {
  switch (op.kind) {
    case 'upsertHabit': {
      const current = data.habits.find((h) => h.id === op.habit.id);
      // Las operaciones encoladas antes de existir los subtipos no los traen.
      const habit = { ...op.habit, subtypes: op.habit.subtypes ?? current?.subtypes ?? [] };
      if (current) {
        return { ...data, habits: data.habits.map((h) => (h.id === habit.id ? habit : h)) };
      }
      return {
        habits: [...data.habits, habit],
        logs: { ...data.logs, [habit.id]: new Set() },
        subtypeLogs: { ...data.subtypeLogs, [habit.id]: {} },
      };
    }
    case 'deleteHabit': {
      const { [op.id]: _l, ...logs } = data.logs;
      const { [op.id]: _s, ...subtypeLogs } = data.subtypeLogs;
      return { habits: data.habits.filter((h) => h.id !== op.id), logs, subtypeLogs };
    }
    case 'setLog': {
      if (!data.habits.some((h) => h.id === op.habitId)) return data;
      const days = new Set(data.logs[op.habitId]);
      const { [op.day]: _removed, ...tags } = data.subtypeLogs[op.habitId] ?? {};
      if (op.done) days.add(op.day);
      else days.delete(op.day);
      return {
        ...data,
        logs: { ...data.logs, [op.habitId]: days },
        subtypeLogs: op.done ? data.subtypeLogs : { ...data.subtypeLogs, [op.habitId]: tags },
      };
    }
    case 'setSubtype': {
      if (!data.habits.some((h) => h.id === op.habitId)) return data;
      const tags = data.subtypeLogs[op.habitId] ?? {};
      const current = tags[op.day] ?? [];
      const next = op.on
        ? current.includes(op.subtypeId)
          ? current
          : [...current, op.subtypeId]
        : current.filter((id) => id !== op.subtypeId);
      const { [op.day]: _old, ...rest } = tags;
      const days = op.on ? new Set(data.logs[op.habitId]).add(op.day) : data.logs[op.habitId] ?? new Set<DayKey>();
      return {
        ...data,
        logs: { ...data.logs, [op.habitId]: days },
        subtypeLogs: { ...data.subtypeLogs, [op.habitId]: next.length > 0 ? { ...rest, [op.day]: next } : rest },
      };
    }
  }
}
