import { byPosition, centers, dropIndex, dropOffset, moveItem, orderBy, shiftFor } from '@/lib/order';

describe('moveItem', () => {
  it('mueve hacia abajo y hacia arriba sin mutar', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('limita el destino y ignora un origen fuera de rango', () => {
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['b', 'a']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('orderBy', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('sigue el orden de ids', () => {
    expect(orderBy(items, ['c', 'a', 'd', 'b']).map((x) => x.id)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('deja al final los que no aparecen e ignora ids desconocidos', () => {
    expect(orderBy(items, ['d', 'x', 'b']).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
  });
});

describe('byPosition', () => {
  it('ordena por position y deja al final, en su orden, las que no tienen', () => {
    const rows = [
      { id: 'a', position: null },
      { id: 'b', position: 1 },
      { id: 'c' },
      { id: 'd', position: 0 },
    ];
    expect(byPosition(rows).map((r) => r.id)).toEqual(['d', 'b', 'a', 'c']);
  });
});

describe('arrastre', () => {
  // Alturas 100, 150, 100 con separación 10 → tops 0, 110, 270.
  const heights = [100, 150, 100];
  const mids = centers(heights, 10);

  it('centers', () => {
    expect(mids).toEqual([50, 185, 320]);
  });

  it('dropIndex según los centros que quedan por encima', () => {
    expect(dropIndex(mids, 0, 50)).toBe(0);
    expect(dropIndex(mids, 0, 190)).toBe(1);
    expect(dropIndex(mids, 0, 400)).toBe(2);
    expect(dropIndex(mids, 2, -20)).toBe(0);
    expect(dropIndex(mids, 2, 180)).toBe(1);
  });

  it('shiftFor mueve solo los que quedan entre origen y destino', () => {
    expect([0, 1, 2].map((i) => shiftFor(i, 0, 2, 110))).toEqual([0, -110, -110]);
    expect([0, 1, 2].map((i) => shiftFor(i, 2, 1, 110))).toEqual([0, 110, 0]);
    expect([0, 1, 2].map((i) => shiftFor(i, 1, 1, 160))).toEqual([0, 0, 0]);
  });

  it('dropOffset lleva al hueco final', () => {
    expect(dropOffset(heights, 10, 0, 2)).toBe(160 + 110);
    expect(dropOffset(heights, 10, 2, 0)).toBe(-(110 + 160));
    expect(dropOffset(heights, 10, 1, 1)).toBe(0);
  });
});
