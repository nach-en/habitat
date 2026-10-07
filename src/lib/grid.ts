import { subYears } from 'date-fns';
import type { CellState, DayKey, Habit } from '@/types';
import { addDays, daysBetween, fromKey, startOfDay, toKey, weekStart } from './dates';
import { isScheduled } from './frequency';

/**
 * Estado visual de la celda de `day` (ver HABITAT.md §6). "Hoy" se pinta aparte.
 *
 * Con `only` (filtro por subtipo) solo cuentan como hechos esos días; los
 * hechos con otro subtipo quedan como `idle`, no como fallo.
 */
export function cellState(
  habit: Habit,
  day: Date,
  logs: Set<DayKey>,
  today: Date,
  only?: Set<DayKey>,
): CellState {
  if (daysBetween(day, today) < 0) return 'future';
  if (daysBetween(fromKey(habit.createdOn), day) < 0) return 'before';
  const key = toKey(day);
  if (logs.has(key)) return !only || only.has(key) ? 'done' : 'idle';
  const past = daysBetween(day, today) > 0;
  if (past && habit.frequency !== 'week' && isScheduled(habit, day)) return 'missed';
  return 'idle';
}

/** Años hacia atrás que se pueden marcar antes de `created_on`. */
export const BACKFILL_YEARS = 2;

/** Primer día que se puede marcar: `created_on` o, si es posterior, hoy menos BACKFILL_YEARS. */
export function earliestEditable(habit: Habit, today: Date): Date {
  const created = fromKey(habit.createdOn);
  const limit = subYears(startOfDay(today), BACKFILL_YEARS);
  return daysBetween(created, limit) < 0 ? limit : created;
}

/** Se pueden alternar días hasta hoy, también anteriores a `created_on` (ver `withStartOn`). */
export function canToggle(habit: Habit, day: Date, today: Date): boolean {
  return daysBetween(earliestEditable(habit, today), day) >= 0 && daysBetween(day, today) >= 0;
}

/**
 * Marcar un día anterior a `created_on` adelanta el inicio del hábito a ese
 * día. Devuelve el hábito con el nuevo inicio, o null si no cambia.
 */
export function withStartOn(habit: Habit, day: DayKey): Habit | null {
  return day < habit.createdOn ? { ...habit, createdOn: day } : null;
}

/**
 * Columnas de la cuadrícula: una por semana (la última es la actual) y siete
 * días por columna, de lunes a domingo.
 */
export function gridColumns(today: Date, weeks: number): Date[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );
}

export type GridLayout = { weeks: number; cell: number; gap: number; width: number; height: number };

/** Tamaño de celda para que `weeks` columnas ocupen exactamente `width`. */
export function gridLayout(width: number, weeks: number, gap: number): GridLayout {
  const cell = Math.max(0, (width - gap * (weeks - 1)) / weeks);
  return { weeks, cell, gap, width, height: cell * 7 + gap * 6 };
}

/** Celda (columna, fila) bajo el punto (x, y), o null si cae fuera de la cuadrícula. */
export function cellAt(
  x: number,
  y: number,
  layout: GridLayout,
): { col: number; row: number } | null {
  const step = layout.cell + layout.gap;
  if (step <= 0 || x < 0 || y < 0) return null;
  const col = Math.floor(x / step);
  const row = Math.floor(y / step);
  if (col >= layout.weeks || row >= 7) return null;
  // Tolerancia: un toque en el hueco cuenta para la celda anterior.
  return { col, row };
}

const STATE_LABELS: Record<CellState, string> = {
  done: 'hecho',
  missed: 'no hecho',
  idle: 'sin marcar',
  before: 'antes de crear el hábito',
  future: 'futuro',
};

/** Texto del estado de una celda para el lector de pantalla. */
export function cellStateLabel(state: CellState): string {
  return STATE_LABELS[state];
}

/**
 * Día enfocado tras mover `delta` días desde `day`, sin salir del rango que se
 * puede alternar (de `created_on`, o del primer día visible, hasta hoy).
 */
export function stepFocusDay(day: Date, delta: number, first: Date, today: Date): Date {
  const next = addDays(day, delta);
  if (daysBetween(first, next) < 0) return first;
  if (daysBetween(next, today) < 0) return today;
  return next;
}
