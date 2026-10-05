import { create } from 'zustand';
import { format, subDays } from 'date-fns';
import type { DayKey, Habit } from '@/types';

type HabitsState = {
  habits: Habit[];
  /** habitId → días hechos. */
  logs: Record<string, Set<DayKey>>;
};

const key = (d: Date): DayKey => format(d, 'yyyy-MM-dd');

// Datos de ejemplo en memoria (hito 1). Se sustituyen por Supabase en el hito 5.
function sampleData(today: Date): HabitsState {
  const habits: Habit[] = [
    {
      id: 'sample-water',
      name: 'Beber agua',
      description: '8 vasos a lo largo del día',
      color: '#5aa9f2',
      icon: 'water',
      frequency: 'daily',
      days: [],
      timesPerWeek: 3,
      reminderEnabled: false,
      reminderTime: '08:00',
      createdOn: key(subDays(today, 90)),
    },
    {
      id: 'sample-run',
      name: 'Correr',
      description: 'Lunes, miércoles y viernes',
      color: '#f2a03d',
      icon: 'run',
      frequency: 'days',
      days: [0, 2, 4],
      timesPerWeek: 3,
      reminderEnabled: false,
      reminderTime: '07:30',
      createdOn: key(subDays(today, 60)),
    },
    {
      id: 'sample-read',
      name: 'Leer',
      description: '20 páginas',
      color: '#8b8cf5',
      icon: 'book',
      frequency: 'week',
      days: [],
      timesPerWeek: 4,
      reminderEnabled: false,
      reminderTime: '22:00',
      createdOn: key(subDays(today, 30)),
    },
  ];

  // Patrón determinista para que las cuadrículas tengan algo que mostrar.
  const logs: Record<string, Set<DayKey>> = {};
  habits.forEach((h, hi) => {
    const set = new Set<DayKey>();
    for (let i = 1; i <= 140; i++) {
      if ((i * (hi + 3)) % 7 < 5) set.add(key(subDays(today, i)));
    }
    logs[h.id] = set;
  });

  return { habits, logs };
}

export const useHabits = create<HabitsState>()(() => sampleData(new Date()));
