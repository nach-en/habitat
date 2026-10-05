import { Text, View } from 'react-native';

// Provisional: el formulario de creación llega en el hito 4.
export default function NewHabitScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg p-6">
      <Text className="font-medium text-lg text-text">Nuevo hábito</Text>
      <Text className="font-sans text-muted mt-1">Formulario en el hito 4.</Text>
    </View>
  );
}
