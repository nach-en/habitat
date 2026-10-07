import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Chip } from './Chip';
import { useHabits } from '@/store/habits';
import { pickerSubtypes } from '@/lib/subtypes';
import { fromKey } from '@/lib/dates';
import { fonts, sizes, useTokens } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

type Props = {
  habit: Habit;
  /** Día que se está marcando; `null` = cerrado. */
  day: DayKey | null;
  today: DayKey;
  onClose: () => void;
};

const NONE: string[] = [];

/** Hoja inferior para marcar qué subtipos se hicieron un día (varios a la vez). */
export function SubtypePicker({ habit, day, today, onClose }: Props) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const marked = useHabits((s) => (day ? s.subtypeLogs[habit.id]?.[day] : undefined) ?? NONE);
  const done = useHabits((s) => (day ? s.logs[habit.id]?.has(day) : false) ?? false);
  const toggleLog = useHabits((s) => s.toggleLog);
  const toggleSubtype = useHabits((s) => s.toggleSubtype);

  const tap = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <Modal visible={day !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Cerrar"
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        {/* Pressable vacío: los toques dentro de la hoja no la cierran. */}
        <Pressable
          onPress={() => {}}
          accessible={false}
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: sizes.cardRadius,
            borderTopRightRadius: sizes.cardRadius,
            padding: 20,
            paddingBottom: insets.bottom + 20,
            gap: 16,
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
          }}
        >
          {day && (
            <>
              <View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: t.text }}>{habit.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: t.muted }}>{dayLabel(day, today)}</Text>
              </View>

              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {pickerSubtypes(habit.subtypes, marked).map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    color={habit.color}
                    selected={marked.includes(s.id)}
                    onPress={() => tap(() => toggleSubtype(habit.id, day, s.id))}
                  />
                ))}
                <Chip
                  label="Sin subtipo"
                  color={habit.color}
                  selected={done && marked.length === 0}
                  disabled={marked.length > 0}
                  onPress={() => tap(() => toggleLog(habit.id, day))}
                />
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="items-center justify-center rounded-2xl"
                style={{ minHeight: 52, backgroundColor: t.text }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.bg }}>Listo</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function dayLabel(day: DayKey, today: DayKey): string {
  if (day === today) return 'Hoy';
  const s = format(fromKey(day), "EEEE d 'de' MMMM", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
