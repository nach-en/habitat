import { canShiftMonth, isInMonth, monthOf, monthWeeks, shiftMonth } from '@/lib/calendar';
import { dow, toKey } from '@/lib/dates';
import { dayTitle, monthTitle } from '@/lib/format';
import { d } from './helpers';

describe('monthWeeks', () => {
  it('6 semanas de lunes a domingo que contienen todo el mes', () => {
    const weeks = monthWeeks(d('2026-10-01'));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7 && dow(w[0]!) === 0)).toBe(true);
    // Octubre 2026 empieza en jueves: la primera fila arranca el lunes 28 de septiembre.
    expect(toKey(weeks[0]![0]!)).toBe('2026-09-28');
    expect(toKey(weeks[5]![6]!)).toBe('2026-11-08');
  });

  it('mes que empieza en lunes', () => {
    expect(toKey(monthWeeks(d('2026-06-01'))[0]![0]!)).toBe('2026-06-01');
  });
});

describe('meses', () => {
  it('monthOf y shiftMonth', () => {
    expect(toKey(monthOf(d('2026-10-17')))).toBe('2026-10-01');
    expect(toKey(shiftMonth(d('2026-01-01'), -1))).toBe('2025-12-01');
  });

  it('solo se navega entre el mes de creación y el actual', () => {
    const created = d('2026-08-20');
    const today = d('2026-10-07');
    expect(canShiftMonth(d('2026-10-01'), 1, created, today)).toBe(false);
    expect(canShiftMonth(d('2026-10-01'), -1, created, today)).toBe(true);
    expect(canShiftMonth(d('2026-08-01'), -1, created, today)).toBe(false);
  });

  it('isInMonth', () => {
    expect(isInMonth(d('2026-09-30'), d('2026-10-01'))).toBe(false);
    expect(isInMonth(d('2026-10-31'), d('2026-10-01'))).toBe(true);
  });
});

describe('format', () => {
  it('dayTitle', () => {
    expect(dayTitle('2026-10-07', '2026-10-07')).toBe('Hoy');
    expect(dayTitle('2026-10-06', '2026-10-07')).toBe('Ayer');
    expect(dayTitle('2026-10-05', '2026-10-07')).toBe('Lunes 5 de octubre');
    expect(monthTitle(d('2026-10-01'))).toBe('oct 2026');
  });
});
