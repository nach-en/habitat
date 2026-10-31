import {
  classifySession,
  defaultMapping,
  EXERCISE_TYPE,
  planMarks,
  pruneProcessed,
  readSince,
  sessionDay,
  type HealthMapping,
  type HealthSession,
} from '@/lib/health';
import type { HabitsData } from '@/lib/ops';
import { d, habit, logs } from './helpers';

const today = d('2026-10-07');

const gym = { id: 'g', name: 'Gym' };
const padel = { id: 'p', name: 'Pádel' };
const hiit = { id: 'x', name: 'HIIT' };
const ejercicio = habit({ id: 'e', frequency: 'week', subtypes: [padel, gym, hiit], createdOn: '2026-09-01' });

const data = (overrides: Partial<HabitsData> = {}): HabitsData => ({
  habits: [ejercicio],
  logs: { e: logs() },
  subtypeLogs: { e: {} },
  ...overrides,
});

const mapping: HealthMapping = {
  strength: { habitId: 'e', subtypeId: 'g' },
  padel: { habitId: 'e', subtypeId: 'p' },
  hiit: { habitId: 'e', subtypeId: 'x' },
};

/** Sesión a mediodía local del día dado. */
const session = (id: string, day: string, exerciseType: number, title?: string): HealthSession => ({
  id,
  exerciseType,
  title,
  startTime: new Date(`${day}T12:00:00`).toISOString(),
});

describe('classifySession', () => {
  it('reconoce fuerza y HIIT por tipo', () => {
    expect(classifySession({ exerciseType: EXERCISE_TYPE.STRENGTH_TRAINING })).toBe('strength');
    expect(classifySession({ exerciseType: EXERCISE_TYPE.HIGH_INTENSITY_INTERVAL_TRAINING })).toBe('hiit');
  });

  it('reconoce pádel por título con cualquier tipo, o por deporte de raqueta', () => {
    expect(classifySession({ exerciseType: EXERCISE_TYPE.OTHER_WORKOUT, title: 'Partido de PÁDEL' })).toBe('padel');
    expect(classifySession({ exerciseType: EXERCISE_TYPE.STRENGTH_TRAINING, title: 'padel' })).toBe('padel');
    expect(classifySession({ exerciseType: EXERCISE_TYPE.RACQUETBALL })).toBe('padel');
    expect(classifySession({ exerciseType: EXERCISE_TYPE.TENNIS })).toBe('padel');
  });

  it('ignora el resto', () => {
    expect(classifySession({ exerciseType: EXERCISE_TYPE.OTHER_WORKOUT, title: 'Paseo' })).toBeNull();
    expect(classifySession({ exerciseType: 56 })).toBeNull();
  });
});

describe('defaultMapping', () => {
  it('busca subtipos activos con ese nombre, sin tildes ni mayúsculas', () => {
    const h = habit({ id: 'e', subtypes: [{ id: 'p', name: 'padel' }, { id: 'g', name: 'GYM' }] });
    expect(defaultMapping([h])).toEqual({
      strength: { habitId: 'e', subtypeId: 'g' },
      padel: { habitId: 'e', subtypeId: 'p' },
      hiit: null,
    });
  });

  it('no propone archivados ni hábitos a dejar', () => {
    const archived = habit({ id: 'a', subtypes: [{ id: 'g', name: 'Gym', archived: true }] });
    const quit = habit({ id: 'q', goal: 'quit', subtypes: [{ id: 'x', name: 'HIIT' }] });
    expect(defaultMapping([archived, quit])).toEqual({ strength: null, padel: null, hiit: null });
  });
});

describe('planMarks', () => {
  it('marca cada sesión en su día con su subtipo', () => {
    const sessions = [
      session('s1', '2026-10-05', EXERCISE_TYPE.STRENGTH_TRAINING),
      session('s2', '2026-10-06', EXERCISE_TYPE.OTHER_WORKOUT, 'Pádel'),
    ];
    expect(planMarks(sessions, mapping, data(), new Set(), today)).toEqual({
      marks: [
        { habitId: 'e', day: '2026-10-05', subtypeId: 'g' },
        { habitId: 'e', day: '2026-10-06', subtypeId: 'p' },
      ],
      processed: ['s1', 's2'],
    });
  });

  it('no repite lo ya marcado ni dos sesiones del mismo día y tipo', () => {
    const sessions = [
      session('s1', '2026-10-05', EXERCISE_TYPE.STRENGTH_TRAINING),
      session('s2', '2026-10-06', EXERCISE_TYPE.STRENGTH_TRAINING),
      session('s3', '2026-10-06', EXERCISE_TYPE.STRENGTH_TRAINING),
    ];
    const current = data({ logs: { e: logs('2026-10-05') }, subtypeLogs: { e: { '2026-10-05': ['g'] } } });
    const { marks, processed } = planMarks(sessions, mapping, current, new Set(), today);
    expect(marks).toEqual([{ habitId: 'e', day: '2026-10-06', subtypeId: 'g' }]);
    expect(processed).toEqual(['s1', 's2', 's3']);
  });

  it('salta las sesiones ya procesadas (un día desmarcado a mano no vuelve)', () => {
    const sessions = [session('s1', '2026-10-05', EXERCISE_TYPE.STRENGTH_TRAINING)];
    expect(planMarks(sessions, mapping, data(), new Set(['s1']), today)).toEqual({ marks: [], processed: [] });
  });

  it('no marca antes del inicio del hábito ni en el futuro, pero las da por procesadas', () => {
    const sessions = [
      session('s1', '2026-08-31', EXERCISE_TYPE.STRENGTH_TRAINING),
      session('s2', '2026-10-08', EXERCISE_TYPE.STRENGTH_TRAINING),
    ];
    expect(planMarks(sessions, mapping, data(), new Set(), today)).toEqual({ marks: [], processed: ['s1', 's2'] });
  });

  it('sin destino, o con destino ya no válido, no marca ni procesa', () => {
    const sessions = [
      session('s1', '2026-10-05', EXERCISE_TYPE.STRENGTH_TRAINING),
      session('s2', '2026-10-05', EXERCISE_TYPE.HIGH_INTENSITY_INTERVAL_TRAINING),
      session('s3', '2026-10-05', 56),
    ];
    const archivedHiit = habit({ ...ejercicio, subtypes: [padel, gym, { ...hiit, archived: true }] });
    const result = planMarks(sessions, { ...mapping, strength: null }, data({ habits: [archivedHiit] }), new Set(), today);
    expect(result).toEqual({ marks: [], processed: [] });
  });
});

describe('fechas', () => {
  it('sessionDay usa el día local del inicio', () => {
    expect(sessionDay({ startTime: new Date('2026-10-05T23:30:00').toISOString() })).toBe('2026-10-05');
  });

  it('readSince relee 2 días desde la última sincronización, como mucho 30', () => {
    const now = new Date('2026-10-07T10:00:00');
    expect(readSince(null, now)).toEqual(new Date('2026-09-07T10:00:00'));
    expect(readSince(new Date('2026-10-06T10:00:00').toISOString(), now)).toEqual(new Date('2026-10-04T10:00:00'));
    expect(readSince(new Date('2026-08-01T10:00:00').toISOString(), now)).toEqual(new Date('2026-09-07T10:00:00'));
  });

  it('pruneProcessed olvida las sesiones que ya no se releen', () => {
    expect(pruneProcessed({ a: '2026-09-01', b: '2026-09-10' }, new Date('2026-10-07T10:00:00'))).toEqual({
      b: '2026-09-10',
    });
  });
});
