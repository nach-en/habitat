import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sizes, useTokens, withAlpha } from '@/theme/tokens';

type Props = {
  checked: boolean;
  color: string;
  /** Nombre del hábito, para el lector de pantalla. */
  label: string;
  /** Hábito a dejar: el botón marca una recaída (aspa gris en lugar de check de color). */
  quit?: boolean;
  onToggle: () => void;
};

export function CheckButton({ checked, color, label, quit = false, onToggle }: Props) {
  const t = useTokens();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    // Marcar una recaída se nota distinto que marcar un hábito hecho.
    (quit && !checked
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(() => {});
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(0.86, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 260 }),
      );
    }
    onToggle();
  };

  const a11y = quit
    ? checked
      ? `${label}: recaída hoy`
      : `${label}: marcar recaída hoy`
    : checked
      ? `${label}: hecho hoy`
      : `${label}: marcar como hecho hoy`;
  // Recaída: gris neutro, para que el color siga significando éxito.
  const accent = quit ? t.muted : color;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={a11y}
      hitSlop={4}
    >
      <Animated.View
        style={[
          {
            width: sizes.check,
            height: sizes.check,
            borderRadius: sizes.checkRadius,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: checked ? accent : withAlpha(accent, quit ? 0.08 : 0.12),
            borderWidth: checked ? 0 : 1.5,
            borderColor: withAlpha(accent, quit ? 0.3 : 0.45),
          },
          animatedStyle,
        ]}
      >
        <Ionicons
          name={quit ? 'close' : 'checkmark'}
          size={quit ? 26 : 28}
          color={checked ? t.card : withAlpha(accent, quit ? 0.6 : 0.55)}
        />
      </Animated.View>
    </Pressable>
  );
}
