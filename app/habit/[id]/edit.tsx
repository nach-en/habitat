import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { closeSheet, goHome } from '@/lib/navigation';
import { HabitForm } from '@/components/HabitForm';
import { confirmDestructive } from '@/lib/confirm';
import { useHabits } from '@/store/habits';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabits((s) => s.habits.find((h) => h.id === id));
  const updateHabit = useHabits((s) => s.updateHabit);
  const deleteHabit = useHabits((s) => s.deleteHabit);

  if (!habit) {
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        <Text className="font-sans text-base text-muted">Este hábito ya no existe.</Text>
      </View>
    );
  }

  const { id: _id, createdOn: _createdOn, ...initial } = habit;

  const onDelete = async () => {
    const ok = await confirmDestructive(
      `¿Eliminar «${habit.name}»?`,
      'Se borrará también todo su historial. No se puede deshacer.',
      'Eliminar',
    );
    if (!ok) return;
    // Vuelve al inicio: el detalle de un hábito borrado no tiene sentido.
    goHome();
    deleteHabit(habit.id);
  };

  return (
    <HabitForm
      title="Editar hábito"
      initial={initial}
      onCancel={() => closeSheet()}
      onSubmit={(input) => {
        updateHabit(habit.id, input);
        closeSheet();
      }}
      onDelete={onDelete}
    />
  );
}
