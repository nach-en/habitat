import type { Frequency, Goal, Habit, Subtype } from '@/types';

/** Fila de `public.habits` tal como la devuelve Supabase. */
export type HabitRow = {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  /** Ausente en filas anteriores a 0003_goal.sql. */
  goal?: Goal;
  frequency: Frequency;
  days: number[];
  times_per_week: number;
  reminder_enabled: boolean;
  /** 'HH:mm:ss' */
  reminder_time: string;
  created_on: string;
  subtypes: Subtype[];
  /** Orden en inicio (0004_position.sql). Ausente o null = al final. Solo lo escribe `reorderHabits`. */
  position?: number | null;
  archived_at?: string | null;
  created_at?: string;
};

export type LogRow = { habit_id: string; day: string; subtype_id: string | null };

export function habitFromRow(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    icon: r.icon,
    goal: r.goal ?? 'build',
    frequency: r.frequency,
    days: [...r.days].sort((a, b) => a - b),
    timesPerWeek: r.times_per_week,
    reminderEnabled: r.reminder_enabled,
    reminderTime: r.reminder_time.slice(0, 5),
    createdOn: r.created_on,
    subtypes: r.subtypes ?? [],
  };
}

/** Columnas que escribe la app (user_id lo pone la BD con auth.uid()). */
export function habitToRow(h: Habit): Omit<HabitRow, 'user_id' | 'position' | 'archived_at' | 'created_at'> {
  return {
    id: h.id,
    name: h.name,
    description: h.description,
    color: h.color,
    icon: h.icon,
    // 'build' es el valor por defecto de la columna: así los hábitos normales se
    // siguen guardando aunque la migración 0003 aún no se haya aplicado.
    ...(h.goal === 'quit' ? { goal: h.goal } : {}),
    frequency: h.frequency,
    days: h.days,
    times_per_week: h.timesPerWeek,
    reminder_enabled: h.reminderEnabled,
    reminder_time: `${h.reminderTime}:00`,
    created_on: h.createdOn,
    subtypes: h.subtypes,
  };
}
