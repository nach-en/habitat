import { shiftTime, validateHabit } from '@/lib/validation';

describe('validateHabit', () => {
  const base = { name: 'Leer', frequency: 'daily' as const, days: [], timesPerWeek: 3 };

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
});

describe('shiftTime', () => {
  it('suma y da la vuelta', () => {
    expect(shiftTime('08:00', 5)).toBe('08:05');
    expect(shiftTime('23:55', 5)).toBe('00:00');
    expect(shiftTime('00:00', -60)).toBe('23:00');
  });
});
