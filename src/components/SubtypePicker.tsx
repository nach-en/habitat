import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubtypeDayChips } from './SubtypeDayChips';
import { dayTitle } from '@/lib/format';
import { fonts, sizes, useTokens } from '@/theme/tokens';
import type { DayKey, Habit } from '@/types';

type Props = {
  habit: Habit;
  /** Día que se está marcando; `null` = cerrado. */
  day: DayKey | null;
  today: DayKey;
  onClose: () => void;
};

/** Hoja inferior para marcar qué subtipos se hicieron un día (varios a la vez). */
export function SubtypePicker({ habit, day, today, onClose }: Props) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
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
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: t.muted }}>{dayTitle(day, today)}</Text>
              </View>

              <SubtypeDayChips habit={habit} day={day} />

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
