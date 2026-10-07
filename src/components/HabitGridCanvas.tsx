import { useMemo, useState } from 'react';
import {
  Pressable,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Canvas, Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import { canToggle, cellAt, cellState, cellStateLabel, gridColumns, gridLayout, stepFocusDay } from '@/lib/grid';
import { fromKey, toKey } from '@/lib/dates';
import { sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { CellState, DayKey, Habit } from '@/types';

export type HabitGridProps = {
  habit: Habit;
  logs: Set<DayKey>;
  /** Filtro por subtipo: solo estos días se pintan como hechos. */
  only?: Set<DayKey> | undefined;
  today: DayKey;
  weeks?: number;
  onToggleDay: (day: DayKey) => void;
  /** Nombre para el lector de pantalla (por defecto, el del hábito). */
  label?: string;
  /** Qué hace tocar dos veces una celda, para el lector de pantalla. */
  activateHint?: string;
};

type Cell = { x: number; y: number; state: CellState; isToday: boolean };

/** Cuadrícula de historial: un único canvas Skia, una columna por semana, lunes arriba. */
export default function HabitGridCanvas({
  habit,
  logs,
  only,
  today,
  weeks = sizes.gridWeeks,
  onToggleDay,
  label = habit.name,
  activateHint = 'marcarlo o desmarcarlo',
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
          state: cellState(habit, day, logs, todayDate, only),
          isToday: toKey(day) === today,
        });
      }),
    );
    return out;
  }, [columns, layout, habit, logs, only, todayDate, today]);

  // Lector de pantalla: la cuadrícula es un control ajustable que recorre los días.
  const [focusKey, setFocusKey] = useState(today);
  const firstDay = useMemo(() => {
    const created = fromKey(habit.createdOn);
    const firstVisible = columns[0]![0]!;
    return created > firstVisible ? created : firstVisible;
  }, [habit.createdOn, columns]);
  const focusDay = stepFocusDay(fromKey(focusKey), 0, firstDay, todayDate);
  const focusText = `${format(focusDay, "EEEE d 'de' MMMM", { locale: es })}: ${cellStateLabel(
    cellState(habit, focusDay, logs, todayDate, only),
  )}`;

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    switch (e.nativeEvent.actionName) {
      case 'increment':
      case 'decrement':
        setFocusKey(toKey(stepFocusDay(focusDay, e.nativeEvent.actionName === 'increment' ? 1 : -1, firstDay, todayDate)));
        break;
      case 'activate':
        if (canToggle(habit, focusDay, todayDate)) onToggleDay(toKey(focusDay));
        break;
    }
  };

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
      accessibilityRole="adjustable"
      accessibilityLabel={`Historial de ${label}`}
      accessibilityValue={{ text: focusText }}
      accessibilityHint={`Desliza arriba o abajo para cambiar de día. Toca dos veces para ${activateHint}.`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={onAccessibilityAction}
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
