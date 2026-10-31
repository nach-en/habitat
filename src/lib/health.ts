import { subDays } from 'date-fns';
import type { DayKey, Habit } from '@/types';
import { toKey } from './dates';
import type { HabitsData } from './ops';
import { activeSubtypes } from './subtypes';

/**
 * Health Connect (Android): qué entrenamientos se reconocen, a qué subtipo de
 * hábito van y qué días se marcan. Solo añade registros: nunca desmarca ni
 * mueve el inicio de un hábito.
 */

export type WorkoutKind = 'strength' | 'padel' | 'hiit';

export const WORKOUT_KINDS: { kind: WorkoutKind; label: string; subtype: string }[] = [
  { kind: 'strength', label: 'Fuerza', subtype: 'Gym' },
  { kind: 'padel', label: 'Pádel', subtype: 'Pádel' },
  { kind: 'hiit', label: 'HIIT', subtype: 'HIIT' },
];

/** `ExerciseSessionRecord.exerciseType` de Health Connect. */
export const EXERCISE_TYPE = {
  OTHER_WORKOUT: 0,
  HIGH_INTENSITY_INTERVAL_TRAINING: 36,
  RACQUETBALL: 50,
  SQUASH: 66,
  STRENGTH_TRAINING: 70,
  TENNIS: 76,
} as const;

/** Lo que se usa de una sesión de ejercicio leída de Health Connect. */
export type HealthSession = {
  id: string;
  exerciseType: number;
  title?: string;
  /** ISO 8601. */
  startTime: string;
};

export type HealthTarget = { habitId: string; subtypeId: string };

/** Destino de cada tipo de entrenamiento; `null` = no se registra. */
export type HealthMapping = Record<WorkoutKind, HealthTarget | null>;

export type HealthMark = { habitId: string; day: DayKey; subtypeId: string };

/** Días que se leen como máximo: Health Connect no da más sin permiso de historial. */
export const READ_DAYS = 30;
/** Margen al releer desde la última sincronización (sesiones que llegan tarde). */
const OVERLAP_DAYS = 2;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const PADEL_TYPES = new Set<number>([EXERCISE_TYPE.RACQUETBALL, EXERCISE_TYPE.TENNIS, EXERCISE_TYPE.SQUASH]);

/**
 * Pádel no tiene tipo propio: cuenta si el título dice "pádel" (con cualquier
 * tipo) o si es un deporte de raqueta parecido.
 */
export function classifySession(s: Pick<HealthSession, 'exerciseType' | 'title'>): WorkoutKind | null {
  if (s.title && norm(s.title).includes('padel')) return 'padel';
  if (s.exerciseType === EXERCISE_TYPE.STRENGTH_TRAINING) return 'strength';
  if (s.exerciseType === EXERCISE_TYPE.HIGH_INTENSITY_INTERVAL_TRAINING) return 'hiit';
  if (PADEL_TYPES.has(s.exerciseType)) return 'padel';
  return null;
}

/** Destinos elegibles: hábitos a construir con subtipos activos. */
export function targetHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.goal === 'build' && activeSubtypes(h.subtypes).length > 0);
}

/** Destino válido: el hábito existe, es a construir y el subtipo sigue activo. */
export function isValidTarget(habits: Habit[], t: HealthTarget | null): t is HealthTarget {
  if (!t) return false;
  const h = habits.find((x) => x.id === t.habitId);
  return !!h && h.goal === 'build' && activeSubtypes(h.subtypes).some((s) => s.id === t.subtypeId);
}

/** Mapeo inicial: el primer hábito con un subtipo activo que se llame como el entrenamiento. */
export function defaultMapping(habits: Habit[]): HealthMapping {
  const find = (name: string): HealthTarget | null => {
    for (const h of targetHabits(habits)) {
      const s = activeSubtypes(h.subtypes).find((x) => norm(x.name) === norm(name));
      if (s) return { habitId: h.id, subtypeId: s.id };
    }
    return null;
  };
  return Object.fromEntries(WORKOUT_KINDS.map((w) => [w.kind, find(w.subtype)])) as HealthMapping;
}

/** Día local de una sesión: el de su inicio. */
export function sessionDay(s: Pick<HealthSession, 'startTime'>): DayKey {
  return toKey(new Date(s.startTime));
}

/**
 * Qué marcar con estas sesiones. Se saltan las ya procesadas (para no volver a
 * marcar un día que se desmarcó a mano), los días antes del inicio del hábito
 * (no se mueve `created_on`), los futuros y los ya marcados con ese subtipo.
 * `processed` son las sesiones con destino, se marquen o no.
 */
export function planMarks(
  sessions: HealthSession[],
  mapping: HealthMapping,
  data: HabitsData,
  done: ReadonlySet<string>,
  today: Date,
): { marks: HealthMark[]; processed: string[] } {
  const todayKey = toKey(today);
  const marks: HealthMark[] = [];
  const processed: string[] = [];
  const seen = new Set<string>();

  for (const s of sessions) {
    if (done.has(s.id)) continue;
    const kind = classifySession(s);
    const target = kind ? mapping[kind] : null;
    if (!isValidTarget(data.habits, target)) continue;
    processed.push(s.id);

    const habit = data.habits.find((h) => h.id === target.habitId);
    const day = sessionDay(s);
    if (!habit || day < habit.createdOn || day > todayKey) continue;
    if (data.subtypeLogs[habit.id]?.[day]?.includes(target.subtypeId)) continue;

    const key = `${habit.id}|${day}|${target.subtypeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    marks.push({ habitId: habit.id, day, subtypeId: target.subtypeId });
  }
  return { marks, processed };
}

/** Desde cuándo leer: la última sincronización con margen, como mucho `READ_DAYS` atrás. */
export function readSince(lastSync: string | null, now: Date): Date {
  const floor = subDays(now, READ_DAYS);
  if (!lastSync) return floor;
  const from = subDays(new Date(lastSync), OVERLAP_DAYS);
  return from > floor ? from : floor;
}

/** Sesiones procesadas (id → día) sin las que ya no se van a releer. */
export function pruneProcessed(processed: Record<string, DayKey>, now: Date): Record<string, DayKey> {
  const keep = toKey(subDays(now, READ_DAYS + OVERLAP_DAYS + 1));
  return Object.fromEntries(Object.entries(processed).filter(([, day]) => day >= keep));
}
