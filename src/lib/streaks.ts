import type { DayKey, Habit, Streak } from '@/types';
import { addDays, daysBetween, eachDay, fromKey, startOfDay, toKey, weekStart } from './dates';
import { isScheduled } from './frequency';
import { cellState } from './grid';

/**
 * Racha actual y mejor racha, en un único recorrido hacia delante desde `created_on`.
 *
 * - 'daily'/'days': días programados consecutivos con registro. Los no programados
 *   se saltan. Hoy sin registrar no rompe la racha; un día programado anterior sí.
 * - 'week': semanas consecutivas que alcanzan `times_per_week`. La semana en curso
 *   no rompe la racha mientras no haya terminado.
 *
 * Hábitos a dejar: días (o semanas) seguidos sin recaída; hoy y la semana en
 * curso cuentan mientras no haya recaída, y una recaída la corta al instante.
 */
export function computeStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
  if (habit.goal === 'quit') {
    return habit.frequency === 'week' ? quitWeeklyStreak(habit, logs, today) : quitDailyStreak(habit, logs, today);
  }
  return habit.frequency === 'week'
    ? weeklyStreak(habit, logs, today)
    : dailyStreak(habit, logs, today);
}

/** Último día con recaída de un hábito a dejar (en 'week', por encima del límite), o null. */
export function lastSlip(habit: Habit, logs: Set<DayKey>, today: Date): DayKey | null {
  const created = fromKey(habit.createdOn);
  for (let d = startOfDay(today); daysBetween(created, d) >= 0; d = addDays(d, -1)) {
    if (cellState(habit, d, logs, today) === 'slip') return toKey(d);
  }
  return null;
}

function quitDailyStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
  let run = 0;
  let best = 0;
  for (const d of eachDay(fromKey(habit.createdOn), today)) {
    if (!isScheduled(habit, d)) continue;
    run = logs.has(toKey(d)) ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return { current: run, best, unit: 'd' };
}

function quitWeeklyStreak(habit: Habit, logs: Set<DayKey>, today: Date): Streak {
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
    run = count > habit.timesPerWeek ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return { current: run, best, unit: 'sem' };
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
