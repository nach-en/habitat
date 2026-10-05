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
  onToggle: () => void;
};

export function CheckButton({ checked, color, label, onToggle }: Props) {
  const t = useTokens();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(0.86, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 260 }),
      );
    }
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? `${label}: hecho hoy` : `${label}: marcar como hecho hoy`}
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
            backgroundColor: checked ? color : withAlpha(color, 0.12),
            borderWidth: checked ? 0 : 1.5,
            borderColor: withAlpha(color, 0.45),
          },
          animatedStyle,
        ]}
      >
        <Ionicons
          name="checkmark"
          size={28}
          color={checked ? t.card : withAlpha(color, 0.55)}
        />
      </Animated.View>
    </Pressable>
  );
}
