import { addMonths, differenceInCalendarMonths, startOfMonth } from 'date-fns';
import { addDays, weekStart } from './dates';

/** Primer día del mes de `d`. */
export function monthOf(d: Date): Date {
  return startOfMonth(d);
}

export function shiftMonth(month: Date, delta: number): Date {
  return startOfMonth(addMonths(month, delta));
}

/**
 * Semanas del calendario del mes (lunes a domingo). Siempre 6 filas, para que
 * la altura no cambie al pasar de mes; incluye días de los meses vecinos.
 */
export function monthWeeks(month: Date): Date[][] {
  const first = weekStart(startOfMonth(month));
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
}

/** Meses navegables: del de `earliest` (primer día que se puede marcar) al de hoy. */
export function canShiftMonth(month: Date, delta: number, earliest: Date, today: Date): boolean {
  const next = shiftMonth(month, delta);
  return differenceInCalendarMonths(next, earliest) >= 0 && differenceInCalendarMonths(today, next) >= 0;
}

export function isInMonth(day: Date, month: Date): boolean {
  return differenceInCalendarMonths(day, month) === 0;
}
