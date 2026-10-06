import type { CellState, DayKey, Habit } from '@/types';
import { addDays, daysBetween, fromKey, toKey, weekStart } from './dates';
import { isScheduled } from './frequency';

/** Estado visual de la celda de `day` (ver HABITAT.md §6). "Hoy" se pinta aparte. */
export function cellState(habit: Habit, day: Date, logs: Set<DayKey>, today: Date): CellState {
  if (daysBetween(day, today) < 0) return 'future';
  if (daysBetween(fromKey(habit.createdOn), day) < 0) return 'before';
  if (logs.has(toKey(day))) return 'done';
  const past = daysBetween(day, today) > 0;
  if (past && habit.frequency !== 'week' && isScheduled(habit, day)) return 'missed';
  return 'idle';
}

/** Solo se pueden alternar días entre `created_on` y hoy, ambos incluidos. */
export function canToggle(habit: Habit, day: Date, today: Date): boolean {
  return daysBetween(fromKey(habit.createdOn), day) >= 0 && daysBetween(day, today) >= 0;
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
