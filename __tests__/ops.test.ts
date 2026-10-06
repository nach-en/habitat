import { applyOp, type HabitsData } from '@/lib/ops';
import { habit, logs } from './helpers';

const data = (): HabitsData => ({ habits: [habit({ id: 'a' })], logs: { a: logs('2026-10-01') } });

describe('applyOp', () => {
  it('upsertHabit añade o reemplaza', () => {
    const added = applyOp(data(), { kind: 'upsertHabit', habit: habit({ id: 'b' }) });
    expect(added.habits.map((h) => h.id)).toEqual(['a', 'b']);
    expect(added.logs.b?.size).toBe(0);

    const renamed = applyOp(data(), { kind: 'upsertHabit', habit: habit({ id: 'a', name: 'Otro' }) });
    expect(renamed.habits).toHaveLength(1);
    expect(renamed.habits[0]!.name).toBe('Otro');
    expect(renamed.logs.a?.has('2026-10-01')).toBe(true);
  });

  it('deleteHabit quita hábito y registros', () => {
    const r = applyOp(data(), { kind: 'deleteHabit', id: 'a' });
    expect(r.habits).toHaveLength(0);
    expect(r.logs).toEqual({});
  });

  it('setLog marca y desmarca sin mutar el original', () => {
    const d = data();
    const on = applyOp(d, { kind: 'setLog', habitId: 'a', day: '2026-10-02', done: true });
    expect(on.logs.a?.has('2026-10-02')).toBe(true);
    expect(d.logs.a?.has('2026-10-02')).toBe(false);

    const off = applyOp(on, { kind: 'setLog', habitId: 'a', day: '2026-10-01', done: false });
    expect(off.logs.a?.has('2026-10-01')).toBe(false);
  });

  it('setLog de un hábito inexistente no hace nada', () => {
    const d = data();
    expect(applyOp(d, { kind: 'setLog', habitId: 'x', day: '2026-10-02', done: true })).toBe(d);
  });
});
