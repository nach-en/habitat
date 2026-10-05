import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useHabits } from '@/store/habits';
import { iconName } from '@/components/icons';
import { todayCounts } from '@/lib/frequency';
import { blend, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { Habit } from '@/types';

export default function HomeScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const habits = useHabits((s) => s.habits);
  const logs = useHabits((s) => s.logs);

  const today = new Date();
  const { done, pending } = todayCounts(habits, logs, today);

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
          gap: 12,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="mb-2">
            <Text className="font-bold text-3xl text-text">Habitat</Text>
            <Text className="font-sans text-base text-muted">{longDate(today)}</Text>
            <Text className="font-medium text-base text-text mt-1">
              {done} hechos · {pending} pendientes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <Text className="font-sans text-base text-muted text-center">
              Aún no tienes hábitos. Crea el primero con el botón de abajo.
            </Text>
          </View>
        }
        renderItem={({ item }) => <HabitRow habit={item} />}
      />

      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Link href="/habit/new" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nuevo hábito"
            className="flex-row items-center gap-2 rounded-full bg-text px-6"
            style={{ minHeight: 52 }}
          >
            <Ionicons name="add" size={22} color={t.bg} />
            <Text className="font-medium text-base text-bg">Nuevo hábito</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function longDate(d: Date): string {
  const s = format(d, "EEEE, d 'de' MMMM", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Fila provisional del hito 1; se sustituye por HabitCard en el hito 3.
function HabitRow({ habit }: { habit: Habit }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      style={{
        backgroundColor: blend(habit.color, t.card, 0.06),
        borderColor: withAlpha(habit.color, 0.2),
        borderWidth: 1,
        borderRadius: sizes.cardRadius,
        padding: sizes.cardPadding,
      }}
      className="flex-row items-center gap-3"
    >
      <View
        style={{
          width: sizes.iconTile,
          height: sizes.iconTile,
          borderRadius: sizes.iconTileRadius,
          backgroundColor: withAlpha(habit.color, 0.17),
        }}
        className="items-center justify-center"
      >
        <Ionicons name={iconName(habit.icon)} size={22} color={habit.color} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-text" style={{ fontSize: 17 }}>
          {habit.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-muted" style={{ fontSize: 13.5 }}>
          {habit.description}
        </Text>
      </View>
    </Pressable>
  );
}
