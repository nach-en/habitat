import { Pressable, Text } from 'react-native';
import { fonts, useTokens, withAlpha } from '@/theme/tokens';

type Props = {
  label: string;
  selected: boolean;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  /** `checkbox` para marcar varios; `radio` para elegir uno (filtro). */
  role?: 'checkbox' | 'radio';
  size?: 'sm' | 'md';
};

export function Chip({ label, selected, color, onPress, disabled, role = 'checkbox', size = 'md' }: Props) {
  const t = useTokens();
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected, disabled } : { checked: selected, disabled }}
      accessibilityLabel={label}
      hitSlop={sm ? { top: 6, bottom: 6 } : undefined}
      className="items-center justify-center rounded-full"
      style={{
        minHeight: sm ? 32 : 44,
        paddingHorizontal: sm ? 12 : 16,
        backgroundColor: selected ? color : withAlpha(color, 0.12),
        borderWidth: 1,
        borderColor: selected ? color : withAlpha(color, 0.3),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: sm ? 13 : 15, color: selected ? t.card : t.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
