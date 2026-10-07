import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useHabits } from '@/store/habits';
import { HabitCard } from '@/components/HabitCard';
import { todayCounts } from '@/lib/frequency';
import { fromKey } from '@/lib/dates';
import { useToday } from '@/hooks/useToday';
import { useTokens } from '@/theme/tokens';
import type { SubtypeLogs } from '@/lib/subtypes';
import type { DayKey } from '@/types';

const EMPTY = new Set<DayKey>();
const NO_SUBTYPES: SubtypeLogs = {};

export default function HomeScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const habits = useHabits((s) => s.habits);
  const logs = useHabits((s) => s.logs);
  const subtypeLogs = useHabits((s) => s.subtypeLogs);
  const toggleLog = useHabits((s) => s.toggleLog);
  const toggleSubtype = useHabits((s) => s.toggleSubtype);
  const status = useHabits((s) => s.status);
  const loadError = useHabits((s) => s.loadError);
  const syncError = useHabits((s) => s.sync.error);
  const reload = useHabits((s) => s.reload);

  const todayKey = useToday();
  const today = fromKey(todayKey);
  const { done, pending } = todayCounts(habits, logs, today);

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading' && habits.length > 0}
            onRefresh={reload}
            tintColor={t.muted}
            colors={[t.text]}
            progressBackgroundColor={t.card}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
          gap: 12,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="mb-2" style={{ gap: 12 }}>
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="font-bold text-3xl text-text">Habitat</Text>
                <Text className="font-sans text-base text-muted">{longDate(today)}</Text>
                <Text className="font-medium text-base text-text mt-1">
                  {done} hechos · {pending} pendientes
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/account')}
                accessibilityRole="button"
                accessibilityLabel="Cuenta"
                className="items-center justify-center"
                style={{ width: 44, height: 44 }}
              >
                <Ionicons name="person-circle-outline" size={28} color={t.muted} />
              </Pressable>
            </View>
            {syncError && <Banner text={syncError} />}
            {status === 'error' && habits.length > 0 && (
              <Banner text={`No se pudieron actualizar tus hábitos (${loadError}). Desliza hacia abajo para reintentar.`} />
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8" style={{ gap: 16 }}>
            {status === 'loading' || status === 'idle' ? (
              <ActivityIndicator color={t.muted} />
            ) : status === 'error' ? (
              <>
                <Text className="font-sans text-base text-muted text-center">
                  No se pudieron cargar tus hábitos.{'\n'}
                  {loadError}
                </Text>
                <Pressable
                  onPress={reload}
                  accessibilityRole="button"
                  className="items-center justify-center rounded-full bg-card px-6"
                  style={{ minHeight: 44 }}
                >
                  <Text className="font-medium text-base text-text">Reintentar</Text>
                </Pressable>
              </>
            ) : (
              <Text className="font-sans text-base text-muted text-center">
                Aún no tienes hábitos. Crea el primero con el botón de abajo.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            logs={logs[item.id] ?? EMPTY}
            subtypeLogs={subtypeLogs[item.id] ?? NO_SUBTYPES}
            today={todayKey}
            onToggleDay={toggleLog}
            onToggleSubtype={toggleSubtype}
          />
        )}
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

function Banner({ text }: { text: string }) {
  const t = useTokens();
  return (
    <View className="flex-row items-center rounded-2xl bg-card px-4 py-3" style={{ gap: 10 }}>
      <Ionicons name="cloud-offline-outline" size={18} color={t.muted} />
      <Text className="font-sans text-muted flex-1" style={{ fontSize: 13.5 }}>
        {text}
      </Text>
    </View>
  );
}

function longDate(d: Date): string {
  const s = format(d, "EEEE, d 'de' MMMM", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
