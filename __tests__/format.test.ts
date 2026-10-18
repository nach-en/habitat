import { relativeDay } from '@/lib/format';

describe('relativeDay', () => {
  it('hoy, ayer o hace N días', () => {
    expect(relativeDay('2026-10-07', '2026-10-07')).toBe('hoy');
    expect(relativeDay('2026-10-06', '2026-10-07')).toBe('ayer');
    expect(relativeDay('2026-09-30', '2026-10-07')).toBe('hace 7 días');
  });
});
