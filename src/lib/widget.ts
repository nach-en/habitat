import type { DayKey, Habit } from '@/types';
import { daysBetween, fromKey, toKey } from './dates';
import { isScheduled, todayCounts, weekCount } from './frequency';
import { computeStreak } from './streaks';
import { pickerSubtypes, type SubtypeLogs } from './subtypes';
import type { HabitsData, Op } from './ops';

/**
 * Widget "Hoy" de Android: qué hábitos muestra, qué hace cada toque y la copia
 * de datos que lee cuando la app no está abierta.
 */

/** Subtipo que se puede marcar desde el widget. */
export type WidgetChip = { id: string; name: string; on: boolean };

export type WidgetRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Hay registro hoy (en un hábito a dejar, una recaída). */
  done: boolean;
  quit: boolean;
  /** "Racha 5 d", "2/3 esta semana" o "12 d sin recaídas". */
  detail: string;
  /** Como la hoja de subtipos: los activos y los archivados marcados hoy. Vacío si no tiene. */
  subtypes: WidgetChip[];
};

/** Toque en el check (`subtypeId` ausente) o en un chip de subtipo. */
export type WidgetClick = { habitId: string; subtypeId?: string };

/**
 * ¿Sale el hábito en la lista de hoy? Desde su inicio y en sus días; los
 * semanales, todos los días aunque ya hayan cumplido (para poder marcar uno más).
 */
function showsToday(habit: Habit, today: Date): boolean {
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
export function todayRows(data: HabitsData, today: Date): WidgetRow[] {
  const key = toKey(today);
  const rows: WidgetRow[] = [];
  for (const habit of data.habits) {
    const logs = data.logs[habit.id] ?? new Set<DayKey>();
    if (!showsToday(habit, today)) continue;
    const marked = data.subtypeLogs[habit.id]?.[key] ?? [];
    rows.push({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      done: logs.has(key),
      quit: habit.goal === 'quit',
      detail: detailOf(habit, logs, today),
      subtypes: pickerSubtypes(habit.subtypes, marked).map((s) => ({
        id: s.id,
        name: s.name,
        on: marked.includes(s.id),
      })),
    });
  }
  return rows;
}

/** Cabecera: hechos hoy de los que tocan hoy (sin los hábitos a dejar). */
export function todaySummary(data: HabitsData, today: Date): { done: number; total: number } {
  const { done, pending } = todayCounts(data.habits, data.logs, today);
  return { done, total: done + pending };
}

/**
 * Operación que hace un toque del widget, o null si ya no aplica.
 * El check marca el día (sin subtipo) o lo desmarca entero. Un chip funciona
 * como en la hoja de subtipos: quitar el último desmarca el día.
 */
export function widgetClick(data: HabitsData, click: WidgetClick, today: Date): Op | null {
  const row = todayRows(data, today).find((r) => r.id === click.habitId);
  if (!row) return null;
  const day = toKey(today);
  const { habitId, subtypeId } = click;
  if (subtypeId === undefined) return { kind: 'setLog', habitId, day, done: !row.done };

  const chip = row.subtypes.find((s) => s.id === subtypeId);
  if (!chip) return null;
  if (!chip.on) return { kind: 'setSubtype', habitId, day, subtypeId, on: true };
  const marked = data.subtypeLogs[habitId]?.[day] ?? [];
  return marked.length === 1
    ? { kind: 'setLog', habitId, day, done: false }
    : { kind: 'setSubtype', habitId, day, subtypeId, on: false };
}

// Medidas de los chips (dp), para repartirlos en líneas: el widget no puede ajustar texto a la anchura.
const CHIP_PADDING = 18;
const CHIP_CHAR = 6.6;
const CHIP_GAP = 6;

/** Anchura aproximada de un chip con ese nombre. */
export function chipWidth(name: string): number {
  return CHIP_PADDING + name.length * CHIP_CHAR;
}

/** Reparte los chips en líneas de `width` dp como mucho (al menos uno por línea). */
export function chipLines<T extends { name: string }>(chips: T[], width: number): T[][] {
  const lines: T[][] = [];
  let line: T[] = [];
  let used = 0;
  for (const chip of chips) {
    const w = chipWidth(chip.name);
    if (line.length > 0 && used + CHIP_GAP + w > width) {
      lines.push(line);
      line = [];
      used = 0;
    }
    used += (line.length > 0 ? CHIP_GAP : 0) + w;
    line.push(chip);
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

type Snapshot = {
  v: 2;
  habits: Habit[];
  logs: Record<string, DayKey[]>;
  subtypeLogs: Record<string, SubtypeLogs>;
};

/** Copia serializada para AsyncStorage. */
export function toSnapshot(data: HabitsData): string {
  const logs = Object.fromEntries(Object.entries(data.logs).map(([id, days]) => [id, [...days]]));
  return JSON.stringify({ v: 2, habits: data.habits, logs, subtypeLogs: data.subtypeLogs } satisfies Snapshot);
}

/** Lee la copia; si falta o no se entiende, devuelve datos vacíos. La v1 no traía subtipos. */
export function fromSnapshot(raw: string | null): HabitsData {
  const empty: HabitsData = { habits: [], logs: {}, subtypeLogs: {} };
  if (!raw) return empty;
  try {
    const s = JSON.parse(raw) as Omit<Snapshot, 'v' | 'subtypeLogs'> & { v: number; subtypeLogs?: Snapshot['subtypeLogs'] };
    if ((s.v !== 1 && s.v !== 2) || !Array.isArray(s.habits)) return empty;
    return {
      habits: s.habits,
      logs: Object.fromEntries(s.habits.map((h) => [h.id, new Set(s.logs[h.id] ?? [])])),
      subtypeLogs: Object.fromEntries(s.habits.map((h) => [h.id, s.subtypeLogs?.[h.id] ?? {}])),
    };
  } catch {
    return empty;
  }
}
