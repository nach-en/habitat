import { useMemo, useState } from 'react';
import { Pressable, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Canvas, Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import { canToggle, cellAt, cellState, gridColumns, gridLayout } from '@/lib/grid';
import { fromKey, toKey } from '@/lib/dates';
import { sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { CellState, DayKey, Habit } from '@/types';

export type HabitGridProps = {
  habit: Habit;
  logs: Set<DayKey>;
  today: DayKey;
  weeks?: number;
  onToggleDay: (day: DayKey) => void;
};

type Cell = { x: number; y: number; state: CellState; isToday: boolean };

/** Cuadrícula de historial: un único canvas Skia, una columna por semana, lunes arriba. */
export default function HabitGridCanvas({
  habit,
  logs,
  today,
  weeks = sizes.gridWeeks,
  onToggleDay,
}: HabitGridProps) {
  const t = useTokens();
  const [width, setWidth] = useState(0);
  const layout = useMemo(() => gridLayout(width, weeks, sizes.cellGap), [width, weeks]);
  const todayDate = useMemo(() => fromKey(today), [today]);
  const columns = useMemo(() => gridColumns(todayDate, weeks), [todayDate, weeks]);

  const cells = useMemo(() => {
    const step = layout.cell + layout.gap;
    const out: Cell[] = [];
    columns.forEach((col, c) =>
      col.forEach((day, r) => {
        out.push({
          x: c * step,
          y: r * step,
          state: cellState(habit, day, logs, todayDate),
          isToday: toKey(day) === today,
        });
      }),
    );
    return out;
  }, [columns, layout, habit, logs, todayDate, today]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onPress = (e: GestureResponderEvent) => {
    // En web el click no trae locationX/Y; offsetX/Y es la posición dentro del canvas.
    const ne = e.nativeEvent as typeof e.nativeEvent & { offsetX?: number; offsetY?: number };
    const hit = cellAt(ne.locationX ?? ne.offsetX ?? -1, ne.locationY ?? ne.offsetY ?? -1, layout);
    if (!hit) return;
    const day = columns[hit.col]?.[hit.row];
    if (day && canToggle(habit, day, todayDate)) onToggleDay(toKey(day));
  };

  const fill: Record<Exclude<CellState, 'future' | 'before'>, string> = {
    done: habit.color,
    missed: t.cellOff,
    idle: t.cellFaint,
  };
  const s = layout.cell;
  const r = Math.min(sizes.cellRadius, s / 3);

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      style={{ height: layout.height || undefined }}
      accessibilityLabel={`Historial de ${habit.name}. Toca un día para marcarlo o desmarcarlo.`}
    >
      {width > 0 && (
        <Canvas style={{ width, height: layout.height }}>
          {cells.map(({ x, y, state, isToday }, i) => {
            if (state === 'future') return null;
            return (
              <Group key={i}>
                {state === 'before' ? (
                  <Circle cx={x + s / 2} cy={y + s / 2} r={Math.max(1, s * 0.08)} color={t.cellFaint} />
                ) : (
                  <RoundedRect x={x} y={y} width={s} height={s} r={r} color={fill[state]} />
                )}
                {isToday && (
                  <RoundedRect
                    x={x + 0.75}
                    y={y + 0.75}
                    width={s - 1.5}
                    height={s - 1.5}
                    r={r}
                    color={withAlpha(t.scheme === 'dark' ? '#ffffff' : '#000000', 0.55)}
                    style="stroke"
                    strokeWidth={1.5}
                  />
                )}
              </Group>
            );
          })}
        </Canvas>
      )}
    </Pressable>
  );
}
