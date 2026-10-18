export type Frequency = 'daily' | 'days' | 'week';

/** 'build': hábito a construir (éxito = hacerlo). 'quit': hábito a dejar (éxito = no hacerlo). */
export type Goal = 'build' | 'quit';

/** Clave de día local en formato 'yyyy-MM-dd' (sin zona horaria). */
export type DayKey = string;

/** Subtipo de un hábito (p. ej. "Pádel" dentro de "Ejercicio"). */
export type Subtype = {
  id: string;
  name: string;
  /** Archivado: no se ofrece al marcar, pero sus registros se conservan. */
  archived?: boolean;
};

export type Habit = {
  id: string;
  name: string;
  description: string;
  /** Hex, p. ej. '#8b8cf5'. */
  color: string;
  /** Clave del mapa de iconos (src/components/icons.ts). */
  icon: string;
  /** No cambia tras crear el hábito: invertiría el significado de su historial. */
  goal: Goal;
  /**
   * 'build': cuándo hacerlo. 'quit': 'daily' = ningún día; 'days' = estos días no
   * (los demás no se siguen); 'week' = como mucho `timesPerWeek` veces.
   */
  frequency: Frequency;
  /** 0 = lunes … 6 = domingo. Solo se usa si frequency === 'days'. */
  days: number[];
  timesPerWeek: number;
  reminderEnabled: boolean;
  /** 'HH:mm'. */
  reminderTime: string;
  createdOn: DayKey;
  /** En orden de presentación; incluye los archivados. */
  subtypes: Subtype[];
};

/**
 * 'build': `done` / `missed` / `idle`. 'quit': `clean` (sin registro), `slip`
 * (registro; en 'week', por encima del límite) y `allowed` (registro dentro del límite semanal).
 */
export type CellState = 'future' | 'before' | 'done' | 'missed' | 'idle' | 'clean' | 'slip' | 'allowed';

export type Streak = { current: number; best: number; unit: 'd' | 'sem' };
