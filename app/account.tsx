import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '@/lib/auth';
import { confirmDestructive } from '@/lib/confirm';
import { closeSheet } from '@/lib/navigation';
import { useHabits } from '@/store/habits';
import { fonts, sizes, useTokens } from '@/theme/tokens';

export default function AccountScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const email = useHabits((s) => s.account?.email);
  const pending = useHabits((s) => s.sync.pending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignOut = async () => {
    const warning =
      pending > 0
        ? `Hay ${pending} cambio(s) sin sincronizar que se perderán.`
        : 'Podrás volver a entrar con tu email y contraseña.';
    if (!(await confirmDestructive('¿Cerrar sesión?', warning, 'Cerrar sesión'))) return;
    setBusy(true);
    setError(null);
    try {
      await signOut();
      // El layout redirige a /login al quedarse sin sesión.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View
        className="flex-row items-center justify-between px-2"
        style={{ paddingTop: insets.top + 4, paddingBottom: 4 }}
      >
        <View style={{ width: 88 }} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: t.text }}>Cuenta</Text>
        <Pressable
          onPress={closeSheet}
          accessibilityRole="button"
          className="items-end justify-center px-3"
          style={{ minHeight: sizes.minTouch, width: 88 }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.text }}>Cerrar</Text>
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: t.muted, lineHeight: 21 }}>
          Tus hábitos se guardan en tu cuenta. Entra con el mismo email en otro dispositivo para verlos allí.
        </Text>
        <View className="rounded-2xl bg-card px-4 py-3">
          <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.text }}>{email ?? '—'}</Text>
        </View>
        <Pressable
          onPress={onSignOut}
          disabled={busy}
          accessibilityRole="button"
          className="items-center justify-center rounded-2xl bg-card"
          style={{ minHeight: 52, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color={t.muted} />
          ) : (
            <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: '#e5484d' }}>Cerrar sesión</Text>
          )}
        </Pressable>
        {error && <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, color: '#e5484d' }}>{error}</Text>}
      </View>
    </View>
  );
}
