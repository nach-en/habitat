import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { HabitGrid } from '@/components/HabitGrid';
import { MonthCalendar } from '@/components/MonthCalendar';
import { SubtypeDayChips } from '@/components/SubtypeDayChips';
import { iconName } from '@/components/icons';
import { useHabits } from '@/store/habits';
import { useToday } from '@/hooks/useToday';
import { monthOf, shiftMonth } from '@/lib/calendar';
import { fromKey } from '@/lib/dates';
import { dayTitle } from '@/lib/format';
import { weekCount } from '@/lib/frequency';
import { canToggle } from '@/lib/grid';
import { computeStreak } from '@/lib/streaks';
import { activeSubtypes, type SubtypeLogs } from '@/lib/subtypes';
import { closeSheet } from '@/lib/navigation';
import { blend, fonts, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

const EMPTY = new Set<DayKey>();
const NO_SUBTYPES: SubtypeLogs = {};
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function HabitDetailScreen() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  const habit = useHabits((s) => s.habits.find((h) => h.id === id));
  const t = useTokens();

  if (!habit) {
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6" style={{ gap: 16 }}>
        <Text className="font-sans text-base text-muted">Este hábito ya no existe.</Text>
        <Pressable onPress={closeSheet} accessibilityRole="button" style={{ minHeight: sizes.minTouch }} className="justify-center">
          <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.text }}>Volver</Text>
        </Pressable>
      </View>
    );
  }
  return <Detail habit={habit} initialDay={day && DAY_RE.test(day) ? day : undefined} />;
}

function Detail({ habit, initialDay }: { habit: Habit; initialDay: DayKey | undefined }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const logs = useHabits((s) => s.logs[habit.id] ?? EMPTY);
  const subtypeLogs = useHabits((s) => s.subtypeLogs[habit.id] ?? NO_SUBTYPES);
  const toggleLog = useHabits((s) => s.toggleLog);

  const today = useToday();
  const todayDate = useMemo(() => fromKey(today), [today]);
  const hasSubtypes = activeSubtypes(habit.subtypes).length > 0;
  const editable = (d: DayKey) => canToggle(habit, fromKey(d), todayDate);

  // El día que llega desde la cuadrícula de inicio decide el mes y la selección.
  const start = initialDay && editable(initialDay) ? initialDay : today;
  const [month, setMonth] = useState(() => monthOf(fromKey(start)));
  const [selected, setSelected] = useState<DayKey>(start);

  const streak = useMemo(() => computeStreak(habit, logs, todayDate), [habit, logs, todayDate]);
  const thisWeek = habit.frequency === 'week' ? weekCount(habit, logs, todayDate) : 0;

  const select = (d: DayKey) => {
    setSelected(d);
    setMonth(monthOf(fromKey(d)));
  };

  const onPressDay = (d: DayKey) => {
    if (!editable(d)) return;
    if (hasSubtypes) return select(d);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleLog(habit.id, d);
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 16,
        gap: 16,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}
    >
      <View className="flex-row items-center justify-between">
        <RoundButton icon="chevron-back" label="Volver" onPress={closeSheet} />
        <RoundButton
          icon="create-outline"
          label={`Editar ${habit.name}`}
          onPress={() => router.push({ pathname: '/habit/[id]/edit', params: { id: habit.id } })}
        />
      </View>

      <View className="flex-row items-center" style={{ gap: 14 }}>
        <View
          className="items-center justify-center"
          style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: withAlpha(habit.color, 0.17) }}
        >
          <Ionicons name={iconName(habit.icon)} size={30} color={habit.color} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: fonts.bold, fontSize: 28, color: t.text }}>
            {habit.name}
          </Text>
          {habit.description !== '' && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: t.muted }}>{habit.description}</Text>
          )}
        </View>
      </View>

      <View
        style={{
          backgroundColor: blend(habit.color, t.card, 0.04),
          borderRadius: sizes.cardRadius,
          padding: sizes.cardPadding,
        }}
      >
        <HabitGrid
          habit={habit}
          logs={logs}
          today={today}
          weeks={26}
          onToggleDay={select}
          activateHint="verlo en el calendario"
        />
      </View>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Pill icon="flame-outline" color={habit.color} text={`Racha ${streak.current} ${streak.unit}`} />
        <Pill icon="trophy-outline" color={habit.color} text={`Mejor ${streak.best} ${streak.unit}`} />
        {habit.frequency === 'week' && (
          <Pill icon="disc-outline" color={habit.color} text={`${thisWeek}/${habit.timesPerWeek} esta semana`} />
        )}
      </View>

      <MonthCalendar
        habit={habit}
        logs={logs}
        subtypeLogs={subtypeLogs}
        today={today}
        month={month}
        selected={hasSubtypes ? selected : null}
        onPressDay={onPressDay}
        onShiftMonth={(delta) => setMonth((m) => shiftMonth(m, delta))}
        footer={hasSubtypes ? 'Toca un día para ver y cambiar sus subtipos' : 'Toca un día para marcarlo o desmarcarlo'}
      />

      {hasSubtypes && (
        <View
          style={{
            backgroundColor: blend(habit.color, t.card, 0.04),
            borderRadius: sizes.cardRadius,
            padding: sizes.cardPadding,
            gap: 12,
          }}
        >
          <Text accessibilityRole="header" style={{ fontFamily: fonts.medium, fontSize: 17, color: t.text }}>
            {dayTitle(selected, today)}
          </Text>
          <SubtypeDayChips habit={habit} day={selected} size="lg" />
        </View>
      )}
    </ScrollView>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'create-outline';
  label: string;
  onPress: () => void;
}) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center justify-center rounded-full bg-card"
      style={{ width: 48, height: 48 }}
    >
      <Ionicons name={icon} size={22} color={t.text} />
    </Pressable>
  );
}

function Pill({ icon, color, text }: { icon: 'flame-outline' | 'trophy-outline' | 'disc-outline'; color: string; text: string }) {
  const t = useTokens();
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ gap: 6, paddingHorizontal: 14, minHeight: 40, backgroundColor: withAlpha(color, 0.14) }}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 14.5, color: t.text }}>{text}</Text>
    </View>
  );
}
