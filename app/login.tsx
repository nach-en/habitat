import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signIn, signUp } from '@/lib/auth';
import { fonts, habitColors, sizes, useTokens } from '@/theme/tokens';

type Mode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

export default function LoginScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return setError('Escribe un email válido');
    if (password.length < MIN_PASSWORD) return setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres`);

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(cleanEmail, password);
      } else if (await signUp(cleanEmail, password)) {
        setInfo('Revisa tu correo para confirmar el registro y después inicia sesión.');
        setMode('login');
      }
      // Con sesión, el layout redirige a la pantalla principal.
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setInfo(null);
  };

  const input = {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: t.text,
    backgroundColor: t.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 justify-center px-6" style={{ gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        {/* Marca: siete cuadraditos con los colores de hábito */}
        <View className="flex-row mb-2" style={{ gap: 4 }}>
          {habitColors.map((c) => (
            <View key={c} style={{ width: 14, height: 14, borderRadius: sizes.cellRadius, backgroundColor: c }} />
          ))}
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 34, color: t.text }}>Habitat</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: t.muted, marginBottom: 12 }}>
          {mode === 'login' ? 'Inicia sesión para ver tus hábitos.' : 'Crea tu cuenta para guardar tus hábitos.'}
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={t.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          style={input}
          accessibilityLabel="Email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={t.muted}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onSubmitEditing={submit}
          style={input}
          accessibilityLabel="Contraseña"
        />

        {error && <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, color: '#e5484d' }}>{error}</Text>}
        {info && <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, color: habitColors[3] }}>{info}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          className="items-center justify-center rounded-2xl mt-2"
          style={{ minHeight: 52, backgroundColor: t.text, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color={t.bg} />
          ) : (
            <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.bg }}>
              {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={switchMode}
          accessibilityRole="button"
          className="items-center justify-center"
          style={{ minHeight: sizes.minTouch }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: t.muted }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Text style={{ fontFamily: fonts.medium, color: t.text }}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Mensajes de Supabase Auth más comunes, en español. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos';
  if (m.includes('email not confirmed')) return 'Confirma tu email desde el correo que te enviamos';
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese email';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un poco y vuelve a probar';
  if (m.includes('fetch') || m.includes('network')) return 'Sin conexión. Inténtalo de nuevo';
  return message;
}
