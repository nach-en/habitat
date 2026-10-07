import {
  SUBTYPES_MAX,
  activeSubtypes,
  addSubtype,
  archiveSubtype,
  daysWithSubtype,
  pickerSubtypes,
} from '@/lib/subtypes';
import type { Subtype } from '@/types';

const gym: Subtype = { id: 'g', name: 'Gym' };
const padel: Subtype = { id: 'p', name: 'Pádel', archived: true };

describe('addSubtype', () => {
  it('añade al final con el nombre recortado', () => {
    expect(addSubtype([gym], '  Elíptica ', 'e')).toEqual({ list: [gym, { id: 'e', name: 'Elíptica' }] });
  });

  it('rechaza vacío, demasiado largo y duplicado (sin distinguir mayúsculas)', () => {
    expect(addSubtype([], '  ', 'x')).toHaveProperty('error');
    expect(addSubtype([], 'x'.repeat(21), 'x')).toHaveProperty('error');
    expect(addSubtype([gym], 'gym', 'x')).toEqual({ error: 'Ya existe' });
  });

  it('recupera uno archivado con el mismo id', () => {
    expect(addSubtype([padel, gym], 'pádel', 'x')).toEqual({ list: [gym, { id: 'p', name: 'pádel' }] });
  });

  it('limita el número de subtipos activos', () => {
    const full = Array.from({ length: SUBTYPES_MAX }, (_, i) => ({ id: `s${i}`, name: `S${i}` }));
    expect(addSubtype(full, 'Otro', 'x')).toHaveProperty('error');
    expect(addSubtype(archiveSubtype(full, 's0'), 'Otro', 'x')).toHaveProperty('list');
  });
});

describe('archivados', () => {
  it('archiveSubtype los oculta de los activos', () => {
    expect(activeSubtypes(archiveSubtype([gym, { id: 'e', name: 'E' }], 'g')).map((s) => s.id)).toEqual(['e']);
  });

  it('el selector muestra activos y los archivados marcados ese día', () => {
    expect(pickerSubtypes([gym, padel], [])).toEqual([gym]);
    expect(pickerSubtypes([gym, padel], ['p'])).toEqual([gym, padel]);
  });
});

it('daysWithSubtype', () => {
  const r = daysWithSubtype({ '2026-10-01': ['g'], '2026-10-02': ['p', 'g'], '2026-10-03': ['p'] }, 'g');
  expect([...r].sort()).toEqual(['2026-10-01', '2026-10-02']);
});
