import { habitFromRow, habitToRow, type HabitRow } from '@/lib/rows';
import { habit } from './helpers';

describe('rows', () => {
  it('ida y vuelta conserva el hábito', () => {
    const h = habit({
      frequency: 'days',
      days: [0, 4],
      reminderTime: '07:15',
      subtypes: [{ id: 's1', name: 'Gym' }, { id: 's2', name: 'Pádel', archived: true }],
    });
    expect(habitFromRow(habitToRow(h) as HabitRow)).toEqual(h);
  });

  it('recorta los segundos de reminder_time y ordena days', () => {
    const r = { ...habitToRow(habit()), reminder_time: '21:30:00', days: [4, 0] } as HabitRow;
    expect(habitFromRow(r)).toMatchObject({ reminderTime: '21:30', days: [0, 4] });
  });

  it('subtipos ausentes en la fila → lista vacía', () => {
    const { subtypes: _s, ...r } = habitToRow(habit());
    expect(habitFromRow(r as HabitRow).subtypes).toEqual([]);
  });
});
