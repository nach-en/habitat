import '../global.css';

import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import { useTokens } from '@/theme/tokens';
import { useHabits } from '@/store/habits';

SplashScreen.preventAutoHideAsync();

/** Sin sesión → /login; con sesión en /login → inicio. */
function useAuthGate(ready: boolean, signedIn: boolean) {
  const segments = useSegments();
  useEffect(() => {
    if (!ready) return;
    const inLogin = segments[0] === 'login';
    if (!signedIn && !inLogin) router.replace('/login');
    if (signedIn && inLogin) router.replace('/');
  }, [ready, signedIn, segments]);
}

export default function RootLayout() {
  const t = useTokens();
  const [loaded, error] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
  });

  const account = useHabits((s) => s.account);
  const ready = (loaded || !!error) && account !== undefined;

  useEffect(() => {
    void useHabits.getState().init();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useAuthGate(ready, !!account);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
