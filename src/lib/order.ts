/**
 * Orden de los hábitos en inicio. Las funciones marcadas como 'worklet' también
 * se usan durante el arrastre en el hilo de UI (Reanimated).
 */

/** Copia de `list` con el elemento de `from` movido a `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

/** Reordena según `ids`; los que no aparecen van al final en su orden actual. */
export function orderBy<T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]));
  return items
    .map((item, i) => ({ item, key: rank.get(item.id) ?? ids.length + i }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}

/**
 * Ordena las filas por `position`; las que no tienen (hábitos nunca reordenados,
 * o la columna aún no existe) van al final conservando el orden recibido.
 */
export function byPosition<T extends { position?: number | null }>(rows: readonly T[]): T[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const pa = a.row.position ?? Infinity;
      const pb = b.row.position ?? Infinity;
      return pa === pb ? a.i - b.i : pa - pb;
    })
    .map((x) => x.row);
}

/** Centro vertical de cada elemento de una pila con alturas `heights` y separación `gap`. */
export function centers(heights: readonly number[], gap: number): number[] {
  'worklet';
  const out: number[] = [];
  let y = 0;
  for (const h of heights) {
    out.push(y + h / 2);
    y += h + gap;
  }
  return out;
}

/**
 * Índice en el que quedaría el elemento `from` si su centro está en `center`:
 * tantos como elementos (sin contarlo) tengan su centro por encima.
 */
export function dropIndex(mids: readonly number[], from: number, center: number): number {
  'worklet';
  let index = 0;
  for (let i = 0; i < mids.length; i++) {
    if (i !== from && (mids[i] ?? 0) < center) index++;
  }
  return index;
}

/**
 * Desplazamiento de `index` mientras `from` se arrastra hacia `to`: los que
 * quedan entre ambos se mueven `size` (alto del arrastrado + separación).
 */
export function shiftFor(index: number, from: number, to: number, size: number): number {
  'worklet';
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -size;
  if (to < from && index >= to && index < from) return size;
  return 0;
}

/** Distancia desde su sitio hasta el hueco final del elemento `from` al soltarlo en `to`. */
export function dropOffset(heights: readonly number[], gap: number, from: number, to: number): number {
  'worklet';
  let d = 0;
  if (to > from) for (let i = from + 1; i <= to; i++) d += (heights[i] ?? 0) + gap;
  else for (let i = to; i < from; i++) d -= (heights[i] ?? 0) + gap;
  return d;
}
