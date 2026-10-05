export type Frequency = 'daily' | 'days' | 'week';

/** Clave de día local en formato 'yyyy-MM-dd' (sin zona horaria). */
export type DayKey = string;

export type Habit = {
  id: string;
  name: string;
  description: string;
  /** Hex, p. ej. '#8b8cf5'. */
  color: string;
  /** Clave del mapa de iconos (src/components/icons.ts). */
  icon: string;
  frequency: Frequency;
  /** 0 = lunes … 6 = domingo. Solo se usa si frequency === 'days'. */
  days: number[];
  timesPerWeek: number;
  reminderEnabled: boolean;
  /** 'HH:mm'. */
  reminderTime: string;
  createdOn: DayKey;
};

export type CellState = 'future' | 'before' | 'done' | 'missed' | 'idle';

export type Streak = { current: number; best: number; unit: 'd' | 'sem' };
