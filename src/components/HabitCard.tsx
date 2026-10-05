import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CheckButton } from './CheckButton';
import { HabitGrid } from './HabitGrid';
import { iconName } from './icons';
import { computeStreak } from '@/lib/streaks';
import { weekCount } from '@/lib/frequency';
import { fromKey } from '@/lib/dates';
import { blend, fonts, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

type Props = {
  habit: Habit;
  logs: Set<DayKey>;
  today: DayKey;
  onToggleDay: (habitId: string, day: DayKey) => void;
};

export const HabitCard = memo(function HabitCard({ habit, logs, today, onToggleDay }: Props) {
  const t = useTokens();
  const todayDate = useMemo(() => fromKey(today), [today]);
  const streak = useMemo(() => computeStreak(habit, logs, todayDate), [habit, logs, todayDate]);
  const thisWeek = habit.frequency === 'week' ? weekCount(habit, logs, todayDate) : 0;
  const unit = streak.unit;

  const openEdit = () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } });
  const toggle = (day: DayKey) => onToggleDay(habit.id, day);

  return (
    <View
      style={{
        backgroundColor: blend(habit.color, t.card, 0.06),
        borderColor: withAlpha(habit.color, 0.2),
        borderWidth: 1,
        borderRadius: sizes.cardRadius,
        padding: sizes.cardPadding,
        gap: 14,
      }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={openEdit}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${habit.name}`}
          className="flex-1 flex-row items-center gap-3"
          style={{ minHeight: sizes.minTouch }}
        >
          <View
            style={{
              width: sizes.iconTile,
              height: sizes.iconTile,
              borderRadius: sizes.iconTileRadius,
              backgroundColor: withAlpha(habit.color, 0.17),
            }}
            className="items-center justify-center"
          >
            <Ionicons name={iconName(habit.icon)} size={22} color={habit.color} />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 17, color: t.text }}>
              {habit.name}
            </Text>
            {habit.description !== '' && (
              <Text
                numberOfLines={1}
                style={{ fontFamily: fonts.regular, fontSize: 13.5, color: t.muted }}
              >
                {habit.description}
              </Text>
            )}
          </View>
        </Pressable>
        <CheckButton
          checked={logs.has(today)}
          color={habit.color}
          label={habit.name}
          onToggle={() => toggle(today)}
        />
      </View>

      <HabitGrid habit={habit} logs={logs} today={today} onToggleDay={toggle} />

      <View className="flex-row gap-4">
        <Stat label="Racha" value={`${streak.current} ${unit}`} />
        <Stat label="Mejor" value={`${streak.best} ${unit}`} />
        {habit.frequency === 'week' && (
          <Stat label="esta semana" value={`${thisWeek}/${habit.timesPerWeek}`} valueFirst />
        )}
      </View>
    </View>
  );
});

function Stat({ label, value, valueFirst }: { label: string; value: string; valueFirst?: boolean }) {
  const t = useTokens();
  const v = <Text style={{ fontFamily: fonts.medium, color: t.text }}>{value}</Text>;
  return (
    <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, color: t.muted }}>
      {valueFirst ? (
        <>
          {v} {label}
        </>
      ) : (
        <>
          {label} {v}
        </>
      )}
    </Text>
  );
}
