import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CheckButton } from './CheckButton';
import { HabitGrid } from './HabitGrid';
import { Chip } from './Chip';
import { SubtypePicker } from './SubtypePicker';
import { iconName } from './icons';
import { computeStreak } from '@/lib/streaks';
import { weekCount } from '@/lib/frequency';
import { fromKey } from '@/lib/dates';
import { activeSubtypes, daysWithSubtype, type SubtypeLogs } from '@/lib/subtypes';
import { blend, fonts, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

type Props = {
  habit: Habit;
  logs: Set<DayKey>;
  subtypeLogs: SubtypeLogs;
  today: DayKey;
  onToggleDay: (habitId: string, day: DayKey) => void;
};

export const HabitCard = memo(function HabitCard({
  habit,
  logs,
  subtypeLogs,
  today,
  onToggleDay,
}: Props) {
  const t = useTokens();
  const todayDate = useMemo(() => fromKey(today), [today]);
  const streak = useMemo(() => computeStreak(habit, logs, todayDate), [habit, logs, todayDate]);
  const thisWeek = habit.frequency === 'week' ? weekCount(habit, logs, todayDate) : 0;
  const unit = streak.unit;

  const subtypes = useMemo(() => activeSubtypes(habit.subtypes), [habit.subtypes]);
  // Filtro de la cuadrícula por subtipo (solo afecta a lo que se ve).
  const [filterId, setFilterId] = useState<string | null>(null);
  const filter = subtypes.find((s) => s.id === filterId) ?? null;
  const only = useMemo(() => (filter ? daysWithSubtype(subtypeLogs, filter.id) : undefined), [filter, subtypeLogs]);
  const [pickerDay, setPickerDay] = useState<DayKey | null>(null);

  const openDetail = (day?: DayKey) =>
    router.push({ pathname: '/habit/[id]', params: day ? { id: habit.id, day } : { id: habit.id } });
  // Aquí solo se marca hoy; los días pasados se editan en el calendario del detalle.
  const toggleToday = () => (subtypes.length > 0 ? setPickerDay(today) : onToggleDay(habit.id, today));

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
          onPress={() => openDetail()}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${habit.name}`}
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
          onToggle={toggleToday}
        />
      </View>

      {subtypes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
          style={{ marginVertical: -4 }}
          accessibilityLabel="Filtrar historial por subtipo"
        >
          <Chip label="Todos" size="sm" role="radio" color={habit.color} selected={!filter} onPress={() => setFilterId(null)} />
          {subtypes.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              size="sm"
              role="radio"
              color={habit.color}
              selected={filter?.id === s.id}
              onPress={() => setFilterId(filter?.id === s.id ? null : s.id)}
            />
          ))}
        </ScrollView>
      )}

      <HabitGrid
        habit={habit}
        logs={logs}
        only={only}
        today={today}
        onToggleDay={openDetail}
        label={filter ? `${habit.name}, ${filter.name}` : habit.name}
        activateHint="abrir ese día en el calendario"
      />

      <View className="flex-row gap-4">
        <Stat label="Racha" value={`${streak.current} ${unit}`} />
        <Stat label="Mejor" value={`${streak.best} ${unit}`} />
        {habit.frequency === 'week' && (
          <Stat label="esta semana" value={`${thisWeek}/${habit.timesPerWeek}`} valueFirst />
        )}
      </View>

      {subtypes.length > 0 && (
        <SubtypePicker habit={habit} day={pickerDay} today={today} onClose={() => setPickerDay(null)} />
      )}
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
