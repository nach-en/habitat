import { reminderContent, reminderFingerprint, reminderTriggers, toExpoWeekday } from '@/lib/reminders';
import { habit } from './helpers';

describe('toExpoWeekday', () => {
  it('lunes = 2 … sábado = 7, domingo = 1', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday)).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });
});

describe('reminderTriggers', () => {
  it('sin recordatorio, nada', () => {
    expect(reminderTriggers(habit({ reminderEnabled: false }))).toEqual([]);
  });

  it("'daily' y 'week': uno diario", () => {
    const t = [{ hour: 7, minute: 15 }];
    expect(reminderTriggers(habit({ reminderEnabled: true, reminderTime: '07:15' }))).toEqual(t);
    expect(
      reminderTriggers(habit({ reminderEnabled: true, reminderTime: '07:15', frequency: 'week' })),
    ).toEqual(t);
  });

  it("'days': uno por día elegido", () => {
    const h = habit({ reminderEnabled: true, reminderTime: '21:00', frequency: 'days', days: [6, 0, 2] });
    expect(reminderTriggers(h)).toEqual([
      { hour: 21, minute: 0, weekday: 2 }, // lunes
      { hour: 21, minute: 0, weekday: 4 }, // miércoles
      { hour: 21, minute: 0, weekday: 1 }, // domingo
    ]);
  });
});

describe('reminderContent', () => {
  it('título = nombre; cuerpo = descripción o texto por defecto', () => {
    expect(reminderContent(habit({ name: 'Leer', description: '20 páginas' }))).toEqual({
      title: 'Leer',
      body: '20 páginas',
    });
    expect(reminderContent(habit({ name: 'Leer', description: '  ' })).body).toBe('Es hora de tu hábito');
  });
});

describe('reminderFingerprint', () => {
  it('cambia con la hora pero no con campos irrelevantes', () => {
    const h = habit({ reminderEnabled: true });
    expect(reminderFingerprint({ ...h, color: '#000000' })).toBe(reminderFingerprint(h));
    expect(reminderFingerprint({ ...h, reminderTime: '09:00' })).not.toBe(reminderFingerprint(h));
  });
});
