import type { DayKey, Habit } from '@/types';

/** Cambio sobre los datos del usuario: se aplica en local y se envía a Supabase. */
export type Op =
  | { kind: 'upsertHabit'; habit: Habit }
  | { kind: 'deleteHabit'; id: string }
  | { kind: 'setLog'; habitId: string; day: DayKey; done: boolean };

export type HabitsData = {
  habits: Habit[];
  /** habitId → días hechos. */
  logs: Record<string, Set<DayKey>>;
};

/** Aplica `op` sobre `data` sin mutarlo. */
export function applyOp(data: HabitsData, op: Op): HabitsData {
  switch (op.kind) {
    case 'upsertHabit': {
      const exists = data.habits.some((h) => h.id === op.habit.id);
      return {
        habits: exists
          ? data.habits.map((h) => (h.id === op.habit.id ? op.habit : h))
          : [...data.habits, op.habit],
        logs: exists ? data.logs : { ...data.logs, [op.habit.id]: new Set() },
      };
    }
    case 'deleteHabit': {
      const { [op.id]: _removed, ...logs } = data.logs;
      return { habits: data.habits.filter((h) => h.id !== op.id), logs };
    }
    case 'setLog': {
      if (!data.habits.some((h) => h.id === op.habitId)) return data;
      const next = new Set(data.logs[op.habitId]);
      if (op.done) next.add(op.day);
      else next.delete(op.day);
      return { ...data, logs: { ...data.logs, [op.habitId]: next } };
    }
  }
}
