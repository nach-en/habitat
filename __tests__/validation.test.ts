import { maxTimesPerWeek, shiftTime, validateHabit } from '@/lib/validation';

describe('validateHabit', () => {
  const base = { name: 'Leer', goal: 'build' as const, frequency: 'daily' as const, days: [], timesPerWeek: 3 };

  it('válido', () => {
    expect(validateHabit(base)).toEqual({});
  });

  it('nombre obligatorio (sin contar espacios)', () => {
    expect(validateHabit({ ...base, name: '   ' })).toHaveProperty('name');
  });

  it("'days' necesita al menos un día", () => {
    expect(validateHabit({ ...base, frequency: 'days' })).toHaveProperty('days');
    expect(validateHabit({ ...base, frequency: 'days', days: [2] })).toEqual({});
  });

  it("'week' entre 1 y 7", () => {
    expect(validateHabit({ ...base, frequency: 'week', timesPerWeek: 0 })).toHaveProperty('timesPerWeek');
    expect(validateHabit({ ...base, frequency: 'week', timesPerWeek: 7 })).toEqual({});
  });

  it("hábito a dejar: 'week' como mucho 6 (7 sería no tener límite)", () => {
    const quit = { ...base, goal: 'quit' as const, frequency: 'week' as const };
    expect(maxTimesPerWeek('quit')).toBe(6);
    expect(validateHabit({ ...quit, timesPerWeek: 6 })).toEqual({});
    expect(validateHabit({ ...quit, timesPerWeek: 7 })).toHaveProperty('timesPerWeek');
  });
});

describe('shiftTime', () => {
  it('suma y da la vuelta', () => {
    expect(shiftTime('08:00', 5)).toBe('08:05');
    expect(shiftTime('23:55', 5)).toBe('00:00');
    expect(shiftTime('00:00', -60)).toBe('23:00');
  });
});
