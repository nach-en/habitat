import type { DayKey, Subtype } from '@/types';

export const SUBTYPE_NAME_MAX = 20;
export const SUBTYPES_MAX = 12;

/** habitId → día → subtipos marcados ese día. */
export type SubtypeLogs = Record<DayKey, string[]>;

const norm = (s: string) => s.trim().toLocaleLowerCase('es');

/** Subtipos que se ofrecen al marcar y en el filtro. */
export function activeSubtypes(list: Subtype[]): Subtype[] {
  return list.filter((s) => !s.archived);
}

/**
 * Añade un subtipo con ese nombre. Si ya existe uno archivado igual, lo
 * recupera (con su historial). Devuelve un error si no se puede.
 */
export function addSubtype(
  list: Subtype[],
  name: string,
  newId: string,
): { list: Subtype[] } | { error: string } {
  const clean = name.trim();
  if (clean === '') return { error: 'Escribe un nombre' };
  if (clean.length > SUBTYPE_NAME_MAX) return { error: `Máximo ${SUBTYPE_NAME_MAX} caracteres` };

  const same = list.find((s) => norm(s.name) === norm(clean));
  if (same && !same.archived) return { error: 'Ya existe' };
  if (activeSubtypes(list).length >= SUBTYPES_MAX) return { error: `Máximo ${SUBTYPES_MAX} subtipos` };

  if (same) {
    // Se recupera y se coloca al final, como uno nuevo.
    return { list: [...list.filter((s) => s !== same), { id: same.id, name: clean }] };
  }
  return { list: [...list, { id: newId, name: clean }] };
}

/** Archiva el subtipo: deja de ofrecerse pero conserva sus registros. */
export function archiveSubtype(list: Subtype[], id: string): Subtype[] {
  return list.map((s) => (s.id === id ? { ...s, archived: true } : s));
}

/** Subtipos que muestra el selector de un día: los activos y los archivados marcados ese día. */
export function pickerSubtypes(list: Subtype[], marked: string[]): Subtype[] {
  return list.filter((s) => !s.archived || marked.includes(s.id));
}

/** Días en los que se marcó `subtypeId`. */
export function daysWithSubtype(logs: SubtypeLogs, subtypeId: string): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const [day, ids] of Object.entries(logs)) if (ids.includes(subtypeId)) out.add(day);
  return out;
}
