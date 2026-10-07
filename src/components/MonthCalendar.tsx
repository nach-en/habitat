import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { canShiftMonth, isInMonth, monthWeeks } from '@/lib/calendar';
import { canToggle, cellState, cellStateLabel, earliestEditable } from '@/lib/grid';
import { fromKey, toKey } from '@/lib/dates';
import { monthTitle } from '@/lib/format';
import type { SubtypeLogs } from '@/lib/subtypes';
import { blend, fonts, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

type Props = {
  habit: Habit;
  logs: Set<DayKey>;
  subtypeLogs: SubtypeLogs;
  today: DayKey;
  /** Primer día del mes que se muestra. */
  month: Date;
  /** Día seleccionado (con subtipos); se marca con borde. */
  selected: DayKey | null;
  onPressDay: (day: DayKey) => void;
  onShiftMonth: (delta: number) => void;
  footer?: string;
};

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MAX_DOTS = 3;

/** Calendario de un mes para marcar días pasados. 42 celdas: aquí bastan `View`s. */
export function MonthCalendar({
  habit,
  logs,
  subtypeLogs,
  today,
  month,
  selected,
  onPressDay,
  onShiftMonth,
  footer,
}: Props) {
  const t = useTokens();
  const todayDate = useMemo(() => fromKey(today), [today]);
  const earliest = useMemo(() => earliestEditable(habit, todayDate), [habit, todayDate]);
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const canPrev = canShiftMonth(month, -1, earliest, todayDate);
  const canNext = canShiftMonth(month, 1, earliest, todayDate);

  return (
    <View
      style={{
        backgroundColor: blend(habit.color, t.card, 0.04),
        borderRadius: sizes.cardRadius,
        padding: 12,
        gap: 6,
      }}
    >
      <View className="flex-row">
        {WEEKDAYS.map((w) => (
          <Text
            key={w}
            className="flex-1 text-center"
            style={{ fontFamily: fonts.regular, fontSize: 13, color: t.muted, paddingVertical: 4 }}
            importantForAccessibility="no"
          >
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, w) => (
        <View key={w} className="flex-row" style={{ gap: 6 }}>
          {week.map((day) => {
            const key = toKey(day);
            const state = cellState(habit, day, logs, todayDate);
            const enabled = canToggle(habit, day, todayDate);
            const inMonth = isInMonth(day, month);
            const isToday = key === today;
            const isSelected = key === selected;
            const dots = Math.min(MAX_DOTS, subtypeLogs[key]?.length ?? 0);
            const done = state === 'done';
            const names = (subtypeLogs[key] ?? [])
              .map((id) => habit.subtypes.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(', ');

            return (
              <Pressable
                key={key}
                onPress={() => onPressDay(key)}
                disabled={!enabled}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: !enabled }}
                accessibilityLabel={`${format(day, "EEEE d 'de' MMMM", { locale: es })}: ${cellStateLabel(state)}${
                  names ? ` (${names})` : ''
                }`}
                className="flex-1 items-center justify-center"
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: done ? withAlpha(habit.color, inMonth ? 0.3 : 0.15) : 'transparent',
                  borderWidth: isSelected || isToday ? 1.5 : 0,
                  borderColor: isSelected ? t.text : habit.color,
                  opacity: enabled ? (inMonth ? 1 : 0.5) : 0.25,
                }}
              >
                <Text
                  style={{
                    fontFamily: isToday ? fonts.bold : fonts.medium,
                    fontSize: 16,
                    color: t.text,
                  }}
                >
                  {day.getDate()}
                </Text>
                {dots > 0 && (
                  <View className="flex-row" style={{ gap: 3, position: 'absolute', bottom: 7 }}>
                    {Array.from({ length: dots }, (_, i) => (
                      <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: habit.color }} />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View className="flex-row items-center justify-between" style={{ marginTop: 6 }}>
        <View
          className="flex-row items-center rounded-full"
          style={{ gap: 8, paddingHorizontal: 14, minHeight: sizes.minTouch, borderWidth: 1, borderColor: withAlpha(t.muted, 0.3) }}
        >
          <Ionicons name="calendar-outline" size={18} color={t.muted} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: t.text }} accessibilityRole="header">
            {monthTitle(month)}
          </Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <MonthButton icon="chevron-back" label="Mes anterior" enabled={canPrev} onPress={() => onShiftMonth(-1)} />
          <MonthButton icon="chevron-forward" label="Mes siguiente" enabled={canNext} onPress={() => onShiftMonth(1)} />
        </View>
      </View>

      {footer && (
        <Text className="text-center" style={{ fontFamily: fonts.regular, fontSize: 13.5, color: t.muted, marginTop: 4 }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

function MonthButton({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      className="items-center justify-center rounded-full"
      style={{
        width: 52,
        height: sizes.minTouch,
        borderWidth: 1,
        borderColor: withAlpha(t.muted, 0.3),
        opacity: enabled ? 1 : 0.3,
      }}
    >
      <Ionicons name={icon} size={20} color={t.text} />
    </Pressable>
  );
}
