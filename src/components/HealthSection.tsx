import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  connectHealth,
  disconnectHealth,
  getHealthMapping,
  healthStatus,
  recentSessions,
  setHealthMapping,
  syncHealth,
  type HealthStatus,
} from '@/health';
import {
  classifySession,
  EXERCISE_TYPE,
  isValidTarget,
  targetHabits,
  WORKOUT_KINDS,
  type HealthMapping,
  type HealthSession,
  type HealthTarget,
} from '@/lib/health';
import { activeSubtypes } from '@/lib/subtypes';
import { useHabits } from '@/store/habits';
import { fonts, useTokens } from '@/theme/tokens';
import { Chip } from './Chip';

const TYPE_NAMES = Object.fromEntries(Object.entries(EXERCISE_TYPE).map(([name, n]) => [n, name]));

/** Cuenta → Health Connect: conectar, a qué subtipo va cada entrenamiento y últimas sesiones. */
export function HealthSection() {
  const t = useTokens();
  const habits = useHabits((s) => s.habits);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [mapping, setMapping] = useState<HealthMapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<HealthSession[] | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await healthStatus());
    setMapping(await getHealthMapping());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const onConnect = () =>
    run(async () => {
      if (!(await connectHealth())) setMessage('Sin permiso para leer el ejercicio.');
      await refresh();
      const n = await syncHealth();
      if (n) setMessage(`${n} día(s) marcados.`);
    });

  const onSync = () =>
    run(async () => {
      const n = await syncHealth();
      setMessage(n === null ? 'No se pudo sincronizar.' : n === 0 ? 'Nada nuevo.' : `${n} día(s) marcados.`);
    });

  const onDisconnect = () =>
    run(async () => {
      await disconnectHealth();
      setSessions(null);
      await refresh();
    });

  const onSessions = () =>
    run(async () => {
      setSessions(sessions ? null : await recentSessions());
    });

  const choose = (kind: keyof HealthMapping, target: HealthTarget | null) => {
    if (!mapping) return;
    const next = { ...mapping, [kind]: target };
    setMapping(next);
    void setHealthMapping(next);
  };

  const text = { fontFamily: fonts.regular, fontSize: 14, color: t.muted, lineHeight: 20 };
  const title = { fontFamily: fonts.medium, fontSize: 16, color: t.text };
  const button = (label: string, onPress: () => void, color = t.text) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      className="items-center justify-center rounded-2xl bg-bg px-4"
      style={{ minHeight: 44, opacity: busy ? 0.6 : 1 }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color }}>{label}</Text>
    </Pressable>
  );

  const options = targetHabits(habits).flatMap((h) =>
    activeSubtypes(h.subtypes).map((s) => ({ target: { habitId: h.id, subtypeId: s.id }, label: `${h.name} · ${s.name}`, color: h.color })),
  );

  return (
    <View className="rounded-2xl bg-card px-4 py-3" style={{ gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Text style={title}>Health Connect</Text>
        {(status === null || busy) && <ActivityIndicator color={t.muted} />}
      </View>

      {status === 'unavailable' && <Text style={text}>Instala o actualiza Health Connect para usarlo.</Text>}

      {status === 'disconnected' && (
        <>
          <Text style={text}>
            Marca solo los entrenamientos registrados en Health Connect (también los del último mes). Nunca desmarca
            días ni los marca antes del inicio del hábito.
          </Text>
          {button('Conectar', onConnect)}
        </>
      )}

      {status === 'connected' && mapping && (
        <>
          {WORKOUT_KINDS.map(({ kind, label }) => {
            const current = mapping[kind];
            const valid = isValidTarget(habits, current);
            return (
              <View key={kind} style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: t.text }}>{label}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  <Chip size="sm" role="radio" label="Ninguno" color={t.muted} selected={!valid} onPress={() => choose(kind, null)} />
                  {options.map((o) => (
                    <Chip
                      key={`${o.target.habitId}|${o.target.subtypeId}`}
                      size="sm"
                      role="radio"
                      label={o.label}
                      color={o.color}
                      selected={valid && current.habitId === o.target.habitId && current.subtypeId === o.target.subtypeId}
                      onPress={() => choose(kind, o.target)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {button('Sincronizar', onSync)}
            {button(sessions ? 'Ocultar sesiones' : 'Ver sesiones', onSessions)}
            {button('Desconectar', onDisconnect, '#e5484d')}
          </View>
          {sessions &&
            (sessions.length === 0 ? (
              <Text style={text}>Sin sesiones en los últimos 30 días.</Text>
            ) : (
              <View style={{ gap: 4 }}>
                {sessions.map((s) => {
                  const kind = classifySession(s);
                  const name = WORKOUT_KINDS.find((w) => w.kind === kind)?.label ?? '—';
                  return (
                    <Text key={s.id} style={{ ...text, fontSize: 13 }}>
                      {format(new Date(s.startTime), "d MMM HH:mm", { locale: es })} ·{' '}
                      {TYPE_NAMES[s.exerciseType] ?? `tipo ${s.exerciseType}`}
                      {s.title ? ` · “${s.title}”` : ''} → {name}
                    </Text>
                  );
                })}
              </View>
            ))}
        </>
      )}

      {message && <Text style={text}>{message}</Text>}
    </View>
  );
}
