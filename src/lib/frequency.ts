import type { DayKey, Habit } from '@/types';
import { addDays, daysBetween, dow, fromKey, toKey, weekStart } from './dates';

/** ¿Es `day` un día programado para el hábito? En 'week' cualquier día vale. */
export function isScheduled(habit: Habit, day: Date): boolean {
  switch (habit.frequency) {
    case 'daily':
    case 'week':
      return true;
    case 'days':
      return habit.days.includes(dow(day));
  }
}

/** Registros de la semana de `today` (desde `created_on`, hasta hoy incluido). */
export function weekCount(habit: Habit, logs: Set<DayKey>, today: Date): number {
  const created = fromKey(habit.createdOn);
  const start = weekStart(today);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    if (daysBetween(d, today) < 0) break;
    if (daysBetween(created, d) < 0) continue;
    if (logs.has(toKey(d))) n++;
  }
  return n;
}

/**
 * ¿Cuenta el hábito para el contador de hoy?
 * 'daily'/'days': si hoy está programado. 'week': si ya se hizo hoy o aún
 * no se ha alcanzado el objetivo semanal.
 */
export function isDueToday(habit: Habit, logs: Set<DayKey>, today: Date): boolean {
  if (daysBetween(fromKey(habit.createdOn), today) < 0) return false;
  if (habit.frequency === 'week') {
    return logs.has(toKey(today)) || weekCount(habit, logs, today) < habit.timesPerWeek;
  }
  return isScheduled(habit, today);
}

/** Contador de cabecera: hechos hoy / pendientes hoy. */
export function todayCounts(
  habits: Habit[],
  logsById: Record<string, Set<DayKey>>,
  today: Date,
): { done: number; pending: number } {
  const key = toKey(today);
  let done = 0;
  let pending = 0;
  for (const h of habits) {
    const logs = logsById[h.id] ?? new Set<DayKey>();
    if (!isDueToday(h, logs, today)) continue;
    if (logs.has(key)) done++;
    else pending++;
  }
  return { done, pending };
}
