import { computeStreak } from '@/lib/streaks';
import { d, habit, logs, run } from './helpers';

// Calendario de referencia: 2026-10-05 es lunes. Hoy = miércoles 2026-10-07.
const today = d('2026-10-07');

describe('computeStreak · daily', () => {
  it('hábito nuevo sin registros', () => {
    expect(computeStreak(habit({ createdOn: '2026-10-07' }), logs(), today)).toEqual({
      current: 0,
      best: 0,
      unit: 'd',
    });
    expect(computeStreak(habit({ createdOn: '2026-09-20' }), logs(), today)).toMatchObject({
      current: 0,
      best: 0,
    });
  });

  it('hoy sin marcar no rompe la racha', () => {
    const l = logs(run('2026-10-01', 6)); // 1–6 oct
    expect(computeStreak(habit(), l, today)).toMatchObject({ current: 6, best: 6 });
  });

  it('marcar hoy suma uno', () => {
    const l = logs(run('2026-10-01', 7)); // 1–7 oct
    expect(computeStreak(habit(), l, today)).toMatchObject({ current: 7, best: 7 });
  });

  it('ayer sin registro rompe la racha', () => {
    const l = logs(run('2026-10-01', 5)); // 1–5 oct, falta el 6
    expect(computeStreak(habit(), l, today)).toMatchObject({ current: 0, best: 5 });
  });

  it('desmarcar un día pasado parte una racha en dos', () => {
    const full = logs(run('2026-09-25', 12)); // 25 sep – 6 oct
    expect(computeStreak(habit(), full, today)).toMatchObject({ current: 12, best: 12 });

    full.delete('2026-10-02');
    // 25 sep – 1 oct (7) | 3 – 6 oct (4)
    expect(computeStreak(habit(), full, today)).toMatchObject({ current: 4, best: 7 });
  });

  it('ignora registros anteriores a created_on', () => {
    const l = logs(run('2026-09-20', 17)); // 20 sep – 6 oct
    expect(computeStreak(habit({ createdOn: '2026-10-01' }), l, today)).toMatchObject({
      current: 6,
      best: 6,
    });
  });
});

describe('computeStreak · days', () => {
  // Lunes, miércoles y viernes.
  const lmv = habit({ frequency: 'days', days: [0, 2, 4], createdOn: '2026-09-28' });

  it('la racha cruza días no programados (fin de semana)', () => {
    const l = logs('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05');
    expect(computeStreak(lmv, l, today)).toMatchObject({ current: 4, best: 4, unit: 'd' });
  });

  it('un día programado pasado sin registro rompe la racha', () => {
    const l = logs('2026-09-28', '2026-10-02', '2026-10-05'); // falta el miércoles 30
    expect(computeStreak(lmv, l, today)).toMatchObject({ current: 2, best: 2 });
  });

  it('los registros en días no programados no suman', () => {
    const l = logs('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-03', '2026-10-05');
    expect(computeStreak(lmv, l, today)).toMatchObject({ current: 4, best: 4 });
  });

  it('hoy programado sin marcar no rompe', () => {
    const l = logs('2026-10-05'); // lunes; hoy miércoles sin marcar
    expect(computeStreak(lmv, l, today)).toMatchObject({ current: 1 });
  });
});

describe('computeStreak · week', () => {
  const weekly = habit({ frequency: 'week', timesPerWeek: 3, createdOn: '2026-09-14' });
  // Semanas: 14 sep, 21 sep, 28 sep, 5 oct (en curso).
  const fullWeeks = [
    '2026-09-14', '2026-09-16', '2026-09-18',
    '2026-09-21', '2026-09-22', '2026-09-27',
    '2026-09-29', '2026-09-30', '2026-10-01',
  ];

  it('hábito nuevo sin registros', () => {
    expect(computeStreak(weekly, logs(), today)).toEqual({ current: 0, best: 0, unit: 'sem' });
  });

  it('la semana en curso incompleta no rompe la racha', () => {
    const l = logs(fullWeeks, '2026-10-05');
    expect(computeStreak(weekly, l, today)).toMatchObject({ current: 3, best: 3 });
  });

  it('la semana en curso completa suma', () => {
    const l = logs(fullWeeks, '2026-10-05', '2026-10-06', '2026-10-07');
    expect(computeStreak(weekly, l, today)).toMatchObject({ current: 4, best: 4 });
  });

  it('una semana pasada sin alcanzar el objetivo rompe la racha', () => {
    const l = logs(fullWeeks);
    l.delete('2026-09-22'); // semana del 21 se queda en 2/3
    expect(computeStreak(weekly, l, today)).toMatchObject({ current: 1, best: 1 });
  });

  it('cuenta la semana de creación si se alcanza el objetivo', () => {
    const h = habit({ frequency: 'week', timesPerWeek: 2, createdOn: '2026-10-01' }); // jueves
    const l = logs('2026-10-01', '2026-10-03');
    expect(computeStreak(h, l, today)).toMatchObject({ current: 1, best: 1 });
  });
});
