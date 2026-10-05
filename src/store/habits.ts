import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { subDays } from 'date-fns';
import type { DayKey, Habit } from '@/types';
import { toKey as key } from '@/lib/dates';
import { isScheduled } from '@/lib/frequency';

type HabitsData = {
  habits: Habit[];
  /** habitId → días hechos. */
  logs: Record<string, Set<DayKey>>;
};

/** Campos editables de un hábito (lo demás lo pone el store). */
export type HabitInput = Omit<Habit, 'id' | 'createdOn'>;

type HabitsState = HabitsData & {
  /** Marca o desmarca `day` para el hábito. */
  toggleLog: (habitId: string, day: DayKey) => void;
  /** Crea un hábito con `created_on` = hoy y devuelve su id. */
  addHabit: (input: HabitInput) => string;
  updateHabit: (id: string, input: HabitInput) => void;
  deleteHabit: (id: string) => void;
};

// Datos de ejemplo en memoria (hito 1). Se sustituyen por Supabase en el hito 5.
function sampleData(today: Date): HabitsData {
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

  // Patrón pseudoaleatorio determinista (~75 % de días hechos) para que las
  // cuadrículas tengan algo que mostrar.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const logs: Record<string, Set<DayKey>> = {};
  for (const h of habits) {
    const set = new Set<DayKey>();
    for (let i = 1; i <= 140; i++) {
      const day = subDays(today, i);
      if (h.frequency === 'days' && !isScheduled(h, day)) continue;
      if (rand() < (h.frequency === 'week' ? 0.55 : 0.75)) set.add(key(day));
    }
    logs[h.id] = set;
  }

  return { habits, logs };
}

export const useHabits = create<HabitsState>()((set) => ({
  ...sampleData(new Date()),

  toggleLog: (habitId, day) =>
    set((s) => {
      const next = new Set(s.logs[habitId]);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return { logs: { ...s.logs, [habitId]: next } };
    }),

  addHabit: (input) => {
    const habit: Habit = { ...input, id: randomUUID(), createdOn: key(new Date()) };
    set((s) => ({ habits: [...s.habits, habit], logs: { ...s.logs, [habit.id]: new Set() } }));
    return habit.id;
  },

  updateHabit: (id, input) =>
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...input } : h)) })),

  deleteHabit: (id) =>
    set((s) => {
      const { [id]: _removed, ...logs } = s.logs;
      return { habits: s.habits.filter((h) => h.id !== id), logs };
    }),
}));
