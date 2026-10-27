import { applyOp, type HabitsData } from '@/lib/ops';
import type { SubtypeLogs } from '@/lib/subtypes';
import {
  chipLines,
  chipWidth,
  fromSnapshot,
  todayRows,
  todaySummary,
  toSnapshot,
  widgetClick,
} from '@/lib/widget';
import { d, habit, logs, run } from './helpers';

// 2026-10-05 es lunes. Hoy = miércoles 2026-10-07.
const today = d('2026-10-07');

type Entry = [ReturnType<typeof habit>, Set<string>, SubtypeLogs?];

const data = (...entries: Entry[]): HabitsData => ({
  habits: entries.map(([h]) => h),
  logs: Object.fromEntries(entries.map(([h, l]) => [h.id, l])),
  subtypeLogs: Object.fromEntries(entries.map(([h, , s]) => [h.id, s ?? {}])),
});

const padel = { id: 'p', name: 'Pádel' };
const gym = { id: 'g', name: 'Gym' };
const old = { id: 'o', name: 'Correr', archived: true };

describe('todayRows', () => {
  it('muestra los hábitos de hoy en orden, con racha', () => {
    const rows = todayRows(
      data(
        [habit({ id: 'a', name: 'Leer' }), logs(run('2026-10-04', 4))],
        [habit({ id: 'b', frequency: 'days', days: [0] }), logs()], // solo lunes
        [habit({ id: 'c', name: 'Agua' }), logs('2026-10-06')],
      ),
      today,
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'c']);
    expect(rows[0]).toMatchObject({ done: true, detail: 'Racha 4 d', quit: false, subtypes: [] });
    expect(rows[1]).toMatchObject({ done: false, detail: 'Racha 1 d' });
  });

  it('semanal: progreso de la semana y desaparece al cumplir si hoy no se hizo', () => {
    const h = habit({ frequency: 'week', timesPerWeek: 2 });
    expect(todayRows(data([h, logs('2026-10-05')]), today)[0]?.detail).toBe('1/2 esta semana');
    expect(todayRows(data([h, logs('2026-10-05', '2026-10-06')]), today)).toEqual([]);
    expect(todayRows(data([h, logs('2026-10-05', '2026-10-07')]), today)[0]?.done).toBe(true);
  });

  it('no muestra hábitos que empiezan después de hoy', () => {
    expect(todayRows(data([habit({ createdOn: '2026-10-08' }), logs()]), today)).toEqual([]);
    expect(todayRows(data([habit({ goal: 'quit', createdOn: '2026-10-08' }), logs()]), today)).toEqual([]);
  });

  it('hábito a dejar: recaída de hoy y días sin recaídas', () => {
    const h = habit({ goal: 'quit', createdOn: '2026-10-01' });
    expect(todayRows(data([h, logs('2026-10-03')]), today)[0]).toMatchObject({
      quit: true,
      done: false,
      detail: '4 d sin recaídas',
    });
    expect(todayRows(data([h, logs('2026-10-07')]), today)[0]?.done).toBe(true);
  });

  it('subtipos: los activos y los archivados marcados hoy', () => {
    const h = habit({ subtypes: [padel, gym, old] });
    expect(todayRows(data([h, logs()]), today)[0]?.subtypes).toEqual([
      { id: 'p', name: 'Pádel', on: false },
      { id: 'g', name: 'Gym', on: false },
    ]);
    const marked = data([h, logs('2026-10-07'), { '2026-10-07': ['g', 'o'], '2026-10-06': ['p'] }]);
    expect(todayRows(marked, today)[0]?.subtypes.map((s) => [s.id, s.on])).toEqual([
      ['p', false],
      ['g', true],
      ['o', true],
    ]);
  });
});

describe('todaySummary', () => {
  it('cuenta los que tocan hoy, sin los hábitos a dejar', () => {
    const s = todaySummary(
      data(
        [habit({ id: 'a' }), logs('2026-10-07')],
        [habit({ id: 'b' }), logs()],
        [habit({ id: 'c', goal: 'quit' }), logs()],
      ),
      today,
    );
    expect(s).toEqual({ done: 1, total: 2 });
  });
});

describe('widgetClick', () => {
  const day = '2026-10-07';

  it('check: marca o desmarca hoy, también en hábitos a dejar y con subtipos', () => {
    expect(widgetClick(data([habit(), logs()]), { habitId: 'h1' }, today)).toEqual({
      kind: 'setLog',
      habitId: 'h1',
      day,
      done: true,
    });
    expect(widgetClick(data([habit(), logs(day)]), { habitId: 'h1' }, today)).toMatchObject({ done: false });
    expect(widgetClick(data([habit({ goal: 'quit' }), logs()]), { habitId: 'h1' }, today)).toMatchObject({
      kind: 'setLog',
      done: true,
    });
    const withTags = data([habit({ subtypes: [padel] }), logs(day), { [day]: ['p'] }]);
    expect(widgetClick(withTags, { habitId: 'h1' }, today)).toMatchObject({ kind: 'setLog', done: false });
  });

  it('chip: marca, quita y al quitar el último desmarca el día', () => {
    const h = habit({ subtypes: [padel, gym] });
    expect(widgetClick(data([h, logs()]), { habitId: 'h1', subtypeId: 'p' }, today)).toEqual({
      kind: 'setSubtype',
      habitId: 'h1',
      day,
      subtypeId: 'p',
      on: true,
    });
    const two = data([h, logs(day), { [day]: ['p', 'g'] }]);
    expect(widgetClick(two, { habitId: 'h1', subtypeId: 'p' }, today)).toMatchObject({
      kind: 'setSubtype',
      on: false,
    });
    const one = data([h, logs(day), { [day]: ['p'] }]);
    expect(widgetClick(one, { habitId: 'h1', subtypeId: 'p' }, today)).toEqual({
      kind: 'setLog',
      habitId: 'h1',
      day,
      done: false,
    });
  });

  it('no hace nada si el hábito o el subtipo ya no está', () => {
    expect(widgetClick(data([habit(), logs()]), { habitId: 'otro' }, today)).toBeNull();
    expect(widgetClick(data([habit({ subtypes: [padel, old] }), logs()]), { habitId: 'h1', subtypeId: 'o' }, today)).toBeNull();
  });
});

describe('chipLines', () => {
  it('reparte los chips en líneas que caben', () => {
    const chips = ['Pádel', 'Gym', 'Yoga', 'Ski'].map((name) => ({ name }));
    const w = (names: string[]) => names.reduce((a, n) => a + chipWidth(n), 0) + 6 * (names.length - 1);
    const lines = chipLines(chips, w(['Pádel', 'Gym']) + 1);
    expect(lines.map((l) => l.map((c) => c.name))).toEqual([['Pádel', 'Gym'], ['Yoga', 'Ski']]);
  });

  it('un chip demasiado largo va solo en su línea', () => {
    expect(chipLines([{ name: 'Un nombre muy largo' }, { name: 'X' }], 40)).toHaveLength(2);
    expect(chipLines([], 100)).toEqual([]);
  });
});

describe('snapshot', () => {
  it('ida y vuelta, y se le puede aplicar una operación', () => {
    const h = habit({ subtypes: [padel] });
    const back = fromSnapshot(toSnapshot(data([h, logs('2026-10-06'), { '2026-10-06': ['p'] }])));
    expect(back.habits).toEqual([h]);
    expect(back.logs.h1).toEqual(logs('2026-10-06'));
    expect(back.subtypeLogs.h1).toEqual({ '2026-10-06': ['p'] });
    const next = applyOp(back, { kind: 'setSubtype', habitId: 'h1', day: '2026-10-07', subtypeId: 'p', on: true });
    expect(next.logs.h1).toEqual(logs('2026-10-06', '2026-10-07'));
  });

  it('lee la v1, sin subtipos', () => {
    const v1 = JSON.stringify({ v: 1, habits: [habit()], logs: { h1: ['2026-10-06'] } });
    expect(fromSnapshot(v1)).toEqual({ habits: [habit()], logs: { h1: logs('2026-10-06') }, subtypeLogs: { h1: {} } });
  });

  it('vacío si falta o está corrupto', () => {
    expect(fromSnapshot(null).habits).toEqual([]);
    expect(fromSnapshot('{').habits).toEqual([]);
    expect(fromSnapshot('{"v":3}').habits).toEqual([]);
  });
});
