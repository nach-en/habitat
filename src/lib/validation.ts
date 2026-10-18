import type { Habit } from '@/types';

export const NAME_MAX = 40;
export const DESCRIPTION_MAX = 80;

type Editable = Pick<Habit, 'name' | 'goal' | 'frequency' | 'days' | 'timesPerWeek'>;

/** Máximo de `times_per_week`: en un hábito a dejar, 7 sería no tener límite. */
export function maxTimesPerWeek(goal: Habit['goal']): number {
  return goal === 'quit' ? 6 : 7;
}

/** Errores del formulario por campo; objeto vacío si es válido. */
export function validateHabit(h: Editable): Partial<Record<'name' | 'days' | 'timesPerWeek', string>> {
  const errors: Partial<Record<'name' | 'days' | 'timesPerWeek', string>> = {};
  if (h.name.trim() === '') errors.name = 'Ponle un nombre';
  if (h.frequency === 'days' && h.days.length === 0) errors.days = 'Elige al menos un día';
  const max = maxTimesPerWeek(h.goal);
  if (h.frequency === 'week' && (h.timesPerWeek < 1 || h.timesPerWeek > max)) {
    errors.timesPerWeek = `Entre 1 y ${max} veces`;
  }
  return errors;
}

/** Suma `delta` minutos a 'HH:mm' dando la vuelta al día. */
export function shiftTime(time: string, delta: number): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const total = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
