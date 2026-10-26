import type { DayKey, Habit } from '@/types';
import { daysBetween, fromKey, toKey } from './dates';
import { isDueToday, isScheduled, todayCounts, weekCount } from './frequency';
import { computeStreak } from './streaks';
import { activeSubtypes } from './subtypes';
import type { HabitsData, Op } from './ops';

/**
 * Widget "Hoy" de Android: qué hábitos muestra, qué hace cada toque y la copia
 * de datos que lee cuando la app no está abierta.
 */

/** Datos que necesita el widget (sin subtipos marcados: no los muestra). */
export type WidgetData = Pick<HabitsData, 'habits' | 'logs'>;

export type WidgetRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Hay registro hoy (en un hábito a dejar, una recaída). */
  done: boolean;
  quit: boolean;
  /**
   * 'toggle': el toque marca o desmarca hoy. 'open': abre el hábito en la app
   * (con subtipos hay que elegir uno; en un hábito a dejar, marcar es una recaída).
   */
  action: 'toggle' | 'open';
  /** "Racha 5 d", "2/3 esta semana" o "12 d sin recaídas". */
  detail: string;
};

/** ¿Sale el hábito en la lista de hoy? */
function showsToday(habit: Habit, logs: Set<DayKey>, today: Date): boolean {
  if (habit.goal === 'build') return isDueToday(habit, logs, today);
  // A dejar: desde su inicio y en los días que se siguen.
  return daysBetween(fromKey(habit.createdOn), today) >= 0 && isScheduled(habit, today);
}

function detailOf(habit: Habit, logs: Set<DayKey>, today: Date): string {
  if (habit.goal === 'build' && habit.frequency === 'week') {
    return `${weekCount(habit, logs, today)}/${habit.timesPerWeek} esta semana`;
  }
  const streak = computeStreak(habit, logs, today);
  const value = `${streak.current} ${streak.unit}`;
  return habit.goal === 'quit' ? `${value} sin recaídas` : `Racha ${value}`;
}

/** Filas del widget, en el orden de inicio. */
export function todayRows(data: WidgetData, today: Date): WidgetRow[] {
  const key = toKey(today);
  const rows: WidgetRow[] = [];
  for (const habit of data.habits) {
    const logs = data.logs[habit.id] ?? new Set<DayKey>();
    if (!showsToday(habit, logs, today)) continue;
    const quit = habit.goal === 'quit';
    rows.push({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      done: logs.has(key),
      quit,
      action: quit || activeSubtypes(habit.subtypes).length > 0 ? 'open' : 'toggle',
      detail: detailOf(habit, logs, today),
    });
  }
  return rows;
}

/** Cabecera: hechos hoy de los que tocan hoy (sin los hábitos a dejar). */
export function todaySummary(data: WidgetData, today: Date): { done: number; total: number } {
  const { done, pending } = todayCounts(data.habits, data.logs, today);
  return { done, total: done + pending };
}

/** Operación que hace el toque del widget sobre el hábito, o null si ese toque no marca. */
export function widgetToggle(data: WidgetData, habitId: string, today: Date): Op | null {
  const row = todayRows(data, today).find((r) => r.id === habitId);
  if (!row || row.action !== 'toggle') return null;
  return { kind: 'setLog', habitId, day: toKey(today), done: !row.done };
}

type Snapshot = { v: 1; habits: Habit[]; logs: Record<string, DayKey[]> };

/** Copia serializada para AsyncStorage. */
export function toSnapshot(data: WidgetData): string {
  const logs = Object.fromEntries(Object.entries(data.logs).map(([id, days]) => [id, [...days]]));
  return JSON.stringify({ v: 1, habits: data.habits, logs } satisfies Snapshot);
}

/** Lee la copia; si falta o no se entiende, devuelve datos vacíos. */
export function fromSnapshot(raw: string | null): HabitsData {
  const empty: HabitsData = { habits: [], logs: {}, subtypeLogs: {} };
  if (!raw) return empty;
  try {
    const s = JSON.parse(raw) as Snapshot;
    if (s.v !== 1 || !Array.isArray(s.habits)) return empty;
    return {
      habits: s.habits,
      logs: Object.fromEntries(s.habits.map((h) => [h.id, new Set(s.logs[h.id] ?? [])])),
      subtypeLogs: Object.fromEntries(s.habits.map((h) => [h.id, {}])),
    };
  } catch {
    return empty;
  }
}
