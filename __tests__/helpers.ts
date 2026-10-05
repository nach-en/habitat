import { addDays } from 'date-fns';
import type { DayKey, Habit } from '@/types';
import { fromKey, toKey } from '@/lib/dates';

export function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    description: '',
    color: '#8b8cf5',
    icon: 'leaf',
    frequency: 'daily',
    days: [],
    timesPerWeek: 3,
    reminderEnabled: false,
    reminderTime: '08:00',
    createdOn: '2026-09-01',
    ...overrides,
  };
}

export const d = (key: DayKey): Date => fromKey(key);

/** Conjunto de días desde `from` durante `n` días consecutivos. */
export function run(from: DayKey, n: number): DayKey[] {
  return Array.from({ length: n }, (_, i) => toKey(addDays(fromKey(from), i)));
}

export const logs = (...keys: (DayKey | DayKey[])[]): Set<DayKey> => new Set(keys.flat());
