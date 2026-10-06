import type { Frequency, Habit } from '@/types';

/** Fila de `public.habits` tal como la devuelve Supabase. */
export type HabitRow = {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency: Frequency;
  days: number[];
  times_per_week: number;
  reminder_enabled: boolean;
  /** 'HH:mm:ss' */
  reminder_time: string;
  created_on: string;
  archived_at?: string | null;
  created_at?: string;
};

export type LogRow = { habit_id: string; day: string };

export function habitFromRow(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    icon: r.icon,
    frequency: r.frequency,
    days: [...r.days].sort((a, b) => a - b),
    timesPerWeek: r.times_per_week,
    reminderEnabled: r.reminder_enabled,
    reminderTime: r.reminder_time.slice(0, 5),
    createdOn: r.created_on,
  };
}

/** Columnas que escribe la app (user_id lo pone la BD con auth.uid()). */
export function habitToRow(h: Habit): Omit<HabitRow, 'user_id' | 'archived_at' | 'created_at'> {
  return {
    id: h.id,
    name: h.name,
    description: h.description,
    color: h.color,
    icon: h.icon,
    frequency: h.frequency,
    days: h.days,
    times_per_week: h.timesPerWeek,
    reminder_enabled: h.reminderEnabled,
    reminder_time: `${h.reminderTime}:00`,
    created_on: h.createdOn,
  };
}
