import { closeSheet } from '@/lib/navigation';
import { HabitForm } from '@/components/HabitForm';
import { useHabits } from '@/store/habits';

export default function NewHabitScreen() {
  const addHabit = useHabits((s) => s.addHabit);
  return (
    <HabitForm
      title="Nuevo hábito"
      onCancel={() => closeSheet()}
      onSubmit={(input) => {
        addHabit(input);
        closeSheet();
      }}
    />
  );
}
