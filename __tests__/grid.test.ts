import { canToggle, cellAt, cellState, cellStateLabel, gridColumns, gridLayout, stepFocusDay } from '@/lib/grid';
import { dow, toKey } from '@/lib/dates';
import { d, habit, logs } from './helpers';

// 2026-10-05 es lunes. Hoy = miércoles 2026-10-07.
const today = d('2026-10-07');

describe('cellState', () => {
  const daily = habit({ createdOn: '2026-10-01' });

  it('future: después de hoy', () => {
    expect(cellState(daily, d('2026-10-08'), logs(), today)).toBe('future');
  });

  it('before: antes de created_on, aunque haya registro', () => {
    expect(cellState(daily, d('2026-09-30'), logs('2026-09-30'), today)).toBe('before');
  });

  it('done: con registro', () => {
    expect(cellState(daily, d('2026-10-02'), logs('2026-10-02'), today)).toBe('done');
    expect(cellState(daily, today, logs('2026-10-07'), today)).toBe('done');
  });

  it('con filtro: hecho con otro subtipo → idle; sin registro sigue siendo fallo', () => {
    const all = logs('2026-10-02', '2026-10-03');
    const only = logs('2026-10-03');
    expect(cellState(daily, d('2026-10-03'), all, today, only)).toBe('done');
    expect(cellState(daily, d('2026-10-02'), all, today, only)).toBe('idle');
    expect(cellState(daily, d('2026-10-04'), all, today, only)).toBe('missed');
  });

  it('missed: programado, pasado y sin registro', () => {
    expect(cellState(daily, d('2026-10-02'), logs(), today)).toBe('missed');
  });

  it('hoy sin registro no es fallo', () => {
    expect(cellState(daily, today, logs(), today)).toBe('idle');
  });

  it('days: no programado → idle; programado → missed', () => {
    const h = habit({ frequency: 'days', days: [0, 2, 4], createdOn: '2026-09-28' });
    expect(cellState(h, d('2026-10-03'), logs(), today)).toBe('idle'); // sábado
    expect(cellState(h, d('2026-10-02'), logs(), today)).toBe('missed'); // viernes
  });

  it('week: sin registro nunca es fallo', () => {
    const h = habit({ frequency: 'week', createdOn: '2026-09-28' });
    expect(cellState(h, d('2026-10-02'), logs(), today)).toBe('idle');
    expect(cellState(h, d('2026-10-02'), logs('2026-10-02'), today)).toBe('done');
  });

  it('el día de creación ya cuenta', () => {
    expect(cellState(daily, d('2026-10-01'), logs(), today)).toBe('missed');
  });
});

describe('canToggle', () => {
  const h = habit({ createdOn: '2026-10-01' });
  it('solo entre created_on y hoy', () => {
    expect(canToggle(h, d('2026-09-30'), today)).toBe(false);
    expect(canToggle(h, d('2026-10-01'), today)).toBe(true);
    expect(canToggle(h, today, today)).toBe(true);
    expect(canToggle(h, d('2026-10-08'), today)).toBe(false);
  });
});

describe('gridColumns', () => {
  const cols = gridColumns(today, 20);

  it('una columna por semana, lunes arriba', () => {
    expect(cols).toHaveLength(20);
    cols.forEach((c) => {
      expect(c).toHaveLength(7);
      expect(dow(c[0]!)).toBe(0);
      expect(dow(c[6]!)).toBe(6);
    });
  });

  it('la última columna es la semana actual', () => {
    expect(cols[19]!.map(toKey)).toContain('2026-10-07');
    expect(toKey(cols[19]![0]!)).toBe('2026-10-05');
    expect(toKey(cols[0]![0]!)).toBe('2026-05-25');
  });
});

describe('gridLayout y cellAt', () => {
  const layout = gridLayout(20 * 10 + 19 * 3, 20, 3); // celdas de 10 px

  it('las celdas ocupan todo el ancho', () => {
    expect(layout.cell).toBeCloseTo(10);
    expect(layout.height).toBeCloseTo(7 * 10 + 6 * 3);
  });

  it('localiza la celda bajo el dedo', () => {
    expect(cellAt(0, 0, layout)).toEqual({ col: 0, row: 0 });
    expect(cellAt(14, 27, layout)).toEqual({ col: 1, row: 2 });
    expect(cellAt(layout.width - 1, layout.height - 1, layout)).toEqual({ col: 19, row: 6 });
  });

  it('fuera de la cuadrícula → null', () => {
    expect(cellAt(-1, 5, layout)).toBeNull();
    expect(cellAt(layout.width + 5, 5, layout)).toBeNull();
    expect(cellAt(5, layout.height + 5, layout)).toBeNull();
  });
});

describe('stepFocusDay', () => {
  const first = d('2026-10-01');
  it('avanza y retrocede sin salir del rango', () => {
    expect(toKey(stepFocusDay(d('2026-10-03'), 1, first, today))).toBe('2026-10-04');
    expect(toKey(stepFocusDay(d('2026-10-01'), -1, first, today))).toBe('2026-10-01');
    expect(toKey(stepFocusDay(today, 1, first, today))).toBe('2026-10-07');
  });
});

describe('cellStateLabel', () => {
  it('da un texto para cada estado', () => {
    expect(cellStateLabel('done')).toBe('hecho');
    expect(cellStateLabel('missed')).toBe('no hecho');
  });
});
