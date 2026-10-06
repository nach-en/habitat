import type { Habit } from '@/types';

// Lógica pura de recordatorios (HABITAT.md §7). La programación real vive en
// notifications.ts; aquí solo se decide qué programar.

/** Disparo semanal (weekday 1 = domingo … 7 = sábado, como expo-notifications) o diario. */
export type ReminderTrigger = { hour: number; minute: number; weekday?: number };

export const DEFAULT_REMINDER_BODY = 'Es hora de tu hábito';

/** dow propio (0 = lunes … 6 = domingo) → weekday de expo-notifications (1 = domingo). */
export function toExpoWeekday(dow: number): number {
  return ((dow + 1) % 7) + 1;
}

/** 'days': uno por cada día elegido; 'daily' y 'week': uno diario. */
export function reminderTriggers(habit: Habit): ReminderTrigger[] {
  if (!habit.reminderEnabled) return [];
  const [hour = 8, minute = 0] = habit.reminderTime.split(':').map(Number);
  if (habit.frequency === 'days') {
    return [...habit.days].sort((a, b) => a - b).map((d) => ({ hour, minute, weekday: toExpoWeekday(d) }));
  }
  return [{ hour, minute }];
}

export function reminderContent(habit: Habit): { title: string; body: string } {
  return { title: habit.name, body: habit.description.trim() || DEFAULT_REMINDER_BODY };
}

/** Huella de lo programado: si no cambia, no hace falta reprogramar. */
export function reminderFingerprint(habit: Habit): string {
  return JSON.stringify([reminderTriggers(habit), reminderContent(habit)]);
}
