import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DayKey } from '@/types';
import { addDays, fromKey, toKey } from './dates';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Hoy", "Ayer" o "Martes 6 de octubre". */
export function dayTitle(day: DayKey, today: DayKey): string {
  if (day === today) return 'Hoy';
  const d = fromKey(day);
  if (toKey(addDays(d, 1)) === today) return 'Ayer';
  return cap(format(d, "EEEE d 'de' MMMM", { locale: es }));
}

/** "oct 2026". */
export function monthTitle(month: Date): string {
  return format(month, 'MMM yyyy', { locale: es }).replace('.', '');
}
