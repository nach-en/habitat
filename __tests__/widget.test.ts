import { applyOp } from '@/lib/ops';
import { fromSnapshot, todayRows, todaySummary, toSnapshot, widgetToggle, type WidgetData } from '@/lib/widget';
import { d, habit, logs, run } from './helpers';

// 2026-10-05 es lunes. Hoy = miércoles 2026-10-07.
const today = d('2026-10-07');

const data = (...entries: [ReturnType<typeof habit>, Set<string>][]): WidgetData => ({
  habits: entries.map(([h]) => h),
  logs: Object.fromEntries(entries.map(([h, l]) => [h.id, l])),
});

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
    expect(rows[0]).toMatchObject({ done: true, action: 'toggle', detail: 'Racha 4 d', quit: false });
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

  it('con subtipos activos o a dejar, el toque abre la app', () => {
    const rows = todayRows(
      data(
        [habit({ id: 'a', subtypes: [{ id: 's', name: 'Pádel' }] }), logs()],
        [habit({ id: 'b', subtypes: [{ id: 's', name: 'Pádel', archived: true }] }), logs()],
        [habit({ id: 'c', goal: 'quit', createdOn: '2026-10-01' }), logs('2026-10-03')],
      ),
      today,
    );
    expect(rows.map((r) => r.action)).toEqual(['open', 'toggle', 'open']);
    expect(rows[2]).toMatchObject({ quit: true, done: false, detail: '4 d sin recaídas' });
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

describe('widgetToggle', () => {
  it('marca o desmarca hoy', () => {
    expect(widgetToggle(data([habit(), logs()]), 'h1', today)).toEqual({
      kind: 'setLog',
      habitId: 'h1',
      day: '2026-10-07',
      done: true,
    });
    expect(widgetToggle(data([habit(), logs('2026-10-07')]), 'h1', today)).toMatchObject({ done: false });
  });

  it('no hace nada si el hábito no se marca desde el widget o ya no está', () => {
    expect(widgetToggle(data([habit({ goal: 'quit' }), logs()]), 'h1', today)).toBeNull();
    expect(widgetToggle(data([habit({ subtypes: [{ id: 's', name: 'X' }] }), logs()]), 'h1', today)).toBeNull();
    expect(widgetToggle(data([habit(), logs()]), 'otro', today)).toBeNull();
  });
});

describe('snapshot', () => {
  it('ida y vuelta, y se le puede aplicar una operación', () => {
    const h = habit();
    const back = fromSnapshot(toSnapshot(data([h, logs('2026-10-06')])));
    expect(back.habits).toEqual([h]);
    expect(back.logs.h1).toEqual(logs('2026-10-06'));
    const next = applyOp(back, { kind: 'setLog', habitId: 'h1', day: '2026-10-07', done: true });
    expect(next.logs.h1).toEqual(logs('2026-10-06', '2026-10-07'));
  });

  it('vacío si falta o está corrupto', () => {
    expect(fromSnapshot(null).habits).toEqual([]);
    expect(fromSnapshot('{').habits).toEqual([]);
    expect(fromSnapshot('{"v":2}').habits).toEqual([]);
  });
});
