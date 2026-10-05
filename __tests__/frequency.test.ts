import { isDueToday, isScheduled, todayCounts, weekCount } from '@/lib/frequency';
import { dow } from '@/lib/dates';
import { d, habit, logs } from './helpers';

// 2026-10-05 es lunes. Hoy = miércoles 2026-10-07.
const today = d('2026-10-07');

describe('dow', () => {
  it('lunes = 0, domingo = 6', () => {
    expect(dow(d('2026-10-05'))).toBe(0);
    expect(dow(d('2026-10-11'))).toBe(6);
  });
});

describe('isScheduled', () => {
  it('daily y week: todos los días', () => {
    expect(isScheduled(habit(), d('2026-10-10'))).toBe(true);
    expect(isScheduled(habit({ frequency: 'week' }), d('2026-10-10'))).toBe(true);
  });

  it('days: solo los días elegidos', () => {
    const h = habit({ frequency: 'days', days: [0, 6] });
    expect(isScheduled(h, d('2026-10-05'))).toBe(true); // lunes
    expect(isScheduled(h, d('2026-10-06'))).toBe(false); // martes
    expect(isScheduled(h, d('2026-10-11'))).toBe(true); // domingo
  });
});

describe('weekCount', () => {
  it('cuenta solo la semana en curso hasta hoy', () => {
    const l = logs('2026-10-04', '2026-10-05', '2026-10-07', '2026-10-08');
    expect(weekCount(habit({ frequency: 'week' }), l, today)).toBe(2);
  });
});

describe('isDueToday y todayCounts', () => {
  const daily = habit({ id: 'a' });
  const lmv = habit({ id: 'b', frequency: 'days', days: [0, 2, 4] }); // hoy miércoles: sí
  const weekend = habit({ id: 'c', frequency: 'days', days: [5, 6] }); // hoy: no
  const weekly = habit({ id: 'd', frequency: 'week', timesPerWeek: 2 });
  const future = habit({ id: 'e', createdOn: '2026-10-08' });

  it('week: deja de estar pendiente al alcanzar el objetivo', () => {
    expect(isDueToday(weekly, logs('2026-10-05'), today)).toBe(true);
    expect(isDueToday(weekly, logs('2026-10-05', '2026-10-06'), today)).toBe(false);
    expect(isDueToday(weekly, logs('2026-10-05', '2026-10-07'), today)).toBe(true);
  });

  it('cuenta hechos y pendientes de hoy', () => {
    const byId = {
      a: logs('2026-10-07'),
      b: logs(),
      c: logs(),
      d: logs('2026-10-05', '2026-10-06'),
      e: logs(),
    };
    expect(todayCounts([daily, lmv, weekend, weekly, future], byId, today)).toEqual({
      done: 1,
      pending: 1,
    });
  });
});
