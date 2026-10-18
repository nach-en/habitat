import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { canShiftMonth, isInMonth, monthOf, monthWeeks, shiftMonth } from '@/lib/calendar';
import { daysBetween, fromKey, toKey } from '@/lib/dates';
import { monthTitle } from '@/lib/format';
import { fonts, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { DayKey } from '@/types';

type Props = {
  value: DayKey;
  /** Primer y último día que se pueden elegir. */
  min: Date;
  max: Date;
  color: string;
  label: string;
  onChange: (day: DayKey) => void;
};

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Campo de fecha: muestra el día y, al tocarlo, un calendario compacto para elegir otro. */
export function DateField({ value, min, max, color, label, onChange }: Props) {
  const t = useTokens();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(fromKey(value)));
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const text = format(fromKey(value), "d 'de' MMMM 'de' yyyy", { locale: es });

  const pick = (day: DayKey) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <View className="rounded-2xl bg-card px-4 py-1">
      <Pressable
        onPress={() => {
          setMonth(monthOf(fromKey(value)));
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between"
        style={{ minHeight: sizes.minTouch }}
      >
        <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: t.text }}>{label}</Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 16, color }}>{text}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
        </View>
      </Pressable>

      {open && (
        <View style={{ gap: 4, paddingBottom: 10 }}>
          <View className="flex-row items-center justify-between">
            <MonthButton icon="chevron-back" label="Mes anterior" enabled={canShiftMonth(month, -1, min, max)} onPress={() => setMonth((m) => shiftMonth(m, -1))} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: t.text }} accessibilityRole="header">
              {monthTitle(month)}
            </Text>
            <MonthButton icon="chevron-forward" label="Mes siguiente" enabled={canShiftMonth(month, 1, min, max)} onPress={() => setMonth((m) => shiftMonth(m, 1))} />
          </View>
          <View className="flex-row">
            {WEEKDAYS.map((w) => (
              <Text
                key={w}
                className="flex-1 text-center"
                style={{ fontFamily: fonts.regular, fontSize: 12.5, color: t.muted }}
                importantForAccessibility="no"
              >
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} className="flex-row" style={{ gap: 4 }}>
              {week.map((day) => {
                const key = toKey(day);
                const enabled = daysBetween(min, day) >= 0 && daysBetween(day, max) >= 0;
                const selected = key === value;
                const inMonth = isInMonth(day, month);
                return (
                  <Pressable
                    key={key}
                    onPress={() => pick(key)}
                    disabled={!enabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !enabled }}
                    accessibilityLabel={format(day, "EEEE d 'de' MMMM", { locale: es })}
                    className="flex-1 items-center justify-center"
                    style={{
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: selected ? color : 'transparent',
                      opacity: enabled ? (inMonth ? 1 : 0.45) : 0.2,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: selected ? t.card : t.text }}>
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
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
      className="items-center justify-center"
      style={{ width: sizes.minTouch, height: sizes.minTouch, borderRadius: sizes.minTouch / 2, backgroundColor: withAlpha(t.muted, 0.12), opacity: enabled ? 1 : 0.3 }}
    >
      <Ionicons name={icon} size={18} color={t.text} />
    </Pressable>
  );
}
