import { applyOp, type HabitsData } from '@/lib/ops';
import { habit, logs } from './helpers';

const data = (): HabitsData => ({
  habits: [habit({ id: 'a' })],
  logs: { a: logs('2026-10-01') },
  subtypeLogs: { a: { '2026-10-01': ['gym'] } },
});

describe('applyOp', () => {
  it('upsertHabit añade o reemplaza', () => {
    const added = applyOp(data(), { kind: 'upsertHabit', habit: habit({ id: 'b' }) });
    expect(added.habits.map((h) => h.id)).toEqual(['a', 'b']);
    expect(added.logs.b?.size).toBe(0);
    expect(added.subtypeLogs.b).toEqual({});

    const renamed = applyOp(data(), { kind: 'upsertHabit', habit: habit({ id: 'a', name: 'Otro' }) });
    expect(renamed.habits).toHaveLength(1);
    expect(renamed.habits[0]!.name).toBe('Otro');
    expect(renamed.logs.a?.has('2026-10-01')).toBe(true);
    expect(renamed.subtypeLogs.a).toEqual({ '2026-10-01': ['gym'] });
  });

  it('upsertHabit sin subtipos (op antigua) conserva los que había', () => {
    const d = applyOp(data(), { kind: 'upsertHabit', habit: habit({ id: 'a', subtypes: [{ id: 'gym', name: 'Gym' }] }) });
    const { subtypes: _s, ...old } = habit({ id: 'a', name: 'Otro' });
    const r = applyOp(d, { kind: 'upsertHabit', habit: old as typeof d.habits[number] });
    expect(r.habits[0]!.subtypes).toEqual([{ id: 'gym', name: 'Gym' }]);
  });

  it('deleteHabit quita hábito y registros', () => {
    const r = applyOp(data(), { kind: 'deleteHabit', id: 'a' });
    expect(r.habits).toHaveLength(0);
    expect(r.logs).toEqual({});
    expect(r.subtypeLogs).toEqual({});
  });

  it('setLog marca y desmarca sin mutar el original', () => {
    const d = data();
    const on = applyOp(d, { kind: 'setLog', habitId: 'a', day: '2026-10-02', done: true });
    expect(on.logs.a?.has('2026-10-02')).toBe(true);
    expect(d.logs.a?.has('2026-10-02')).toBe(false);

    const off = applyOp(on, { kind: 'setLog', habitId: 'a', day: '2026-10-01', done: false });
    expect(off.logs.a?.has('2026-10-01')).toBe(false);
    expect(off.subtypeLogs.a).toEqual({});
  });

  it('setLog hecho no toca los subtipos del día', () => {
    const r = applyOp(data(), { kind: 'setLog', habitId: 'a', day: '2026-10-01', done: true });
    expect(r.subtypeLogs.a).toEqual({ '2026-10-01': ['gym'] });
  });

  it('setSubtype marca el día y añade el subtipo una sola vez', () => {
    const d = data();
    const r = applyOp(d, { kind: 'setSubtype', habitId: 'a', day: '2026-10-02', subtypeId: 'padel', on: true });
    expect(r.logs.a?.has('2026-10-02')).toBe(true);
    expect(r.subtypeLogs.a?.['2026-10-02']).toEqual(['padel']);
    expect(d.logs.a?.has('2026-10-02')).toBe(false);

    const twice = applyOp(r, { kind: 'setSubtype', habitId: 'a', day: '2026-10-01', subtypeId: 'gym', on: true });
    expect(twice.subtypeLogs.a?.['2026-10-01']).toEqual(['gym']);
    const both = applyOp(r, { kind: 'setSubtype', habitId: 'a', day: '2026-10-01', subtypeId: 'padel', on: true });
    expect(both.subtypeLogs.a?.['2026-10-01']).toEqual(['gym', 'padel']);
  });

  it('setSubtype off quita el subtipo pero el día sigue hecho', () => {
    const r = applyOp(data(), { kind: 'setSubtype', habitId: 'a', day: '2026-10-01', subtypeId: 'gym', on: false });
    expect(r.subtypeLogs.a).toEqual({});
    expect(r.logs.a?.has('2026-10-01')).toBe(true);
  });

  it('setLog de un hábito inexistente no hace nada', () => {
    const d = data();
    expect(applyOp(d, { kind: 'setLog', habitId: 'x', day: '2026-10-02', done: true })).toBe(d);
  });
});
