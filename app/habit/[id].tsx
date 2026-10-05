import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useHabits } from '@/store/habits';

// Provisional: el formulario de edición llega en el hito 4.
export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabits((s) => s.habits.find((h) => h.id === id));
  return (
    <View className="flex-1 items-center justify-center bg-bg p-6">
      <Text className="font-medium text-lg text-text">{habit?.name ?? 'Hábito no encontrado'}</Text>
      <Text className="font-sans text-muted mt-1">Edición en el hito 4.</Text>
    </View>
  );
}
