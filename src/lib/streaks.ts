import type { DayKey, Habit, Streak } from '@/types';
import { addDays, daysBetween, eachDay, fromKey, toKey, weekStart } from './dates';
import { isScheduled } from './frequency';

/**
 * Racha actual y mejor racha, en un único recorrido hacia delante desde `created_on`.
 *
 * - 'daily'/'days': días programados consecutivos con registro. Los no programados
 *   se saltan. Hoy sin registrar no rompe la racha; un día programado anterior sí.
 * - 'week': semanas consecutivas que alcanzan `times_per_week`. La semana en curso
 *   no rompe la racha mientras no haya terminado.
 */
export function computeStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
  return habit.frequency === 'week'
    ? weeklyStreak(habit, logs, today)
    : dailyStreak(habit, logs, today);
}

function dailyStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
  const created = fromKey(habit.createdOn);
  let run = 0;
  let best = 0;
  for (const d of eachDay(created, today)) {
    if (!isScheduled(habit, d)) continue;
    if (logs.has(toKey(d))) {
      run++;
      best = Math.max(best, run);
    } else if (daysBetween(d, today) > 0) {
      run = 0;
    }
  }
  return { current: run, best, unit: 'd' };
}

function weeklyStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
  const created = fromKey(habit.createdOn);
  const current = weekStart(today);
  let run = 0;
  let best = 0;
  for (let ws = weekStart(created); daysBetween(ws, current) >= 0; ws = addDays(ws, 7)) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (daysBetween(created, d) < 0 || daysBetween(d, today) < 0) continue;
      if (logs.has(toKey(d))) count++;
    }
    if (count >= habit.timesPerWeek) {
      run++;
      best = Math.max(best, run);
    } else if (daysBetween(ws, current) > 0) {
      run = 0;
    }
  }
  return { current: run, best, unit: 'sem' };
}
