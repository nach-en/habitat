import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Chip } from './Chip';
import { useHabits } from '@/store/habits';
import { pickerSubtypes } from '@/lib/subtypes';
import type { DayKey, Habit } from '@/types';

const NONE: string[] = [];

/** Chips para marcar los subtipos de un día (varios a la vez) o "Sin subtipo". */
export function SubtypeDayChips({ habit, day, size }: { habit: Habit; day: DayKey; size?: 'md' | 'lg' }) {
  const marked = useHabits((s) => s.subtypeLogs[habit.id]?.[day] ?? NONE);
  const done = useHabits((s) => s.logs[habit.id]?.has(day) ?? false);
  const toggleLog = useHabits((s) => s.toggleLog);
  const toggleSubtype = useHabits((s) => s.toggleSubtype);

  const tap = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {pickerSubtypes(habit.subtypes, marked).map((s) => (
        <Chip
          key={s.id}
          label={s.name}
          color={habit.color}
          size={size}
          selected={marked.includes(s.id)}
          onPress={() => tap(() => toggleSubtype(habit.id, day, s.id))}
        />
      ))}
      <Chip
        label="Sin subtipo"
        color={habit.color}
        size={size}
        selected={done && marked.length === 0}
        disabled={marked.length > 0}
        onPress={() => tap(() => toggleLog(habit.id, day))}
      />
    </View>
  );
}
