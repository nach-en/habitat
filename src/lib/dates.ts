import { addDays, differenceInCalendarDays, format, parse, startOfDay, startOfWeek } from 'date-fns';
import type { DayKey } from '@/types';

// Todas las fechas son días locales del usuario. La semana empieza en lunes.

/** Date → 'yyyy-MM-dd' (local). */
export function toKey(d: Date): DayKey {
  return format(d, 'yyyy-MM-dd');
}

/** 'yyyy-MM-dd' → Date a medianoche local. */
export function fromKey(key: DayKey): Date {
  return parse(key, 'yyyy-MM-dd', new Date(0));
}

/** Día de la semana con lunes = 0 … domingo = 6. */
export function dow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Lunes (00:00) de la semana de `d`. */
export function weekStart(d: Date): Date {
  return startOfWeek(startOfDay(d), { weekStartsOn: 1 });
}

/** Días naturales de `a` a `b` (b − a). */
export function daysBetween(a: Date, b: Date): number {
  return differenceInCalendarDays(b, a);
}

export function isSameDay(a: Date, b: Date): boolean {
  return daysBetween(a, b) === 0;
}

/** Itera cada día de `from` a `to`, ambos incluidos. */
export function* eachDay(from: Date, to: Date): Generator<Date> {
  const n = daysBetween(from, to);
  const start = startOfDay(from);
  for (let i = 0; i <= n; i++) yield addDays(start, i);
}

export { addDays, startOfDay };
