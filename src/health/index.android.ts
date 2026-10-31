import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { DayKey } from '@/types';
import { useHabits } from '@/store/habits';
import {
  defaultMapping,
  planMarks,
  pruneProcessed,
  readSince,
  sessionDay,
  type HealthMapping,
  type HealthSession,
} from '@/lib/health';
import type { HealthStatus } from './index';

export type { HealthStatus };

/**
 * Health Connect (solo Android): lee las sesiones de ejercicio y marca los
 * subtipos configurados. Se sincroniza al cargar los datos y al volver a la app.
 */

export const healthSupported = true;

type Settings = {
  enabled: boolean;
  /** `null`: aún sin tocar; se usa `defaultMapping` con los hábitos actuales. */
  mapping: HealthMapping | null;
  lastSync: string | null;
  /** Sesiones ya procesadas (id → día), para no volver a marcarlas. */
  processed: Record<string, DayKey>;
};

const EMPTY: Settings = { enabled: false, mapping: null, lastSync: null, processed: {} };
const PERMISSION = { accessType: 'read', recordType: 'ExerciseSession' } as const;

/** Ajustes por cuenta: Health Connect es del móvil, pero los hábitos son de cada usuario. */
function settingsKey(): string | null {
  const id = useHabits.getState().account?.id;
  return id ? `habitat.health.v1:${id}` : null;
}

async function loadSettings(): Promise<Settings> {
  const key = settingsKey();
  const raw = key && (await AsyncStorage.getItem(key).catch(() => null));
  if (!raw) return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return EMPTY;
  }
}

async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const key = settingsKey();
  if (!key) return;
  const next = { ...(await loadSettings()), ...patch };
  await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
}

let ready: Promise<boolean> | null = null;

/** Health Connect disponible e inicializado. */
function ensureClient(): Promise<boolean> {
  ready ??= getSdkStatus()
    .then((status) => status === SdkAvailabilityStatus.SDK_AVAILABLE && initialize())
    .catch(() => false);
  const current = ready;
  // Si no estaba (p. ej. hay que actualizarlo), se reintenta la próxima vez.
  void current.then((ok) => {
    if (!ok && ready === current) ready = null;
  });
  return current;
}

async function hasPermission(): Promise<boolean> {
  const granted = await getGrantedPermissions().catch(() => []);
  return granted.some((p) => p.accessType === 'read' && 'recordType' in p && p.recordType === 'ExerciseSession');
}

export async function healthStatus(): Promise<HealthStatus> {
  if (!(await ensureClient())) return 'unavailable';
  const { enabled } = await loadSettings();
  return enabled && (await hasPermission()) ? 'connected' : 'disconnected';
}

/** Pide el permiso de lectura de ejercicio y activa la sincronización. */
export async function connectHealth(): Promise<boolean> {
  if (!(await ensureClient())) return false;
  await requestPermission([PERMISSION]).catch(() => []);
  const ok = await hasPermission();
  if (ok) await saveSettings({ enabled: true });
  return ok;
}

/** Deja de sincronizar (el permiso se quita desde Health Connect). */
export async function disconnectHealth(): Promise<void> {
  await saveSettings({ enabled: false });
}

export async function getHealthMapping(): Promise<HealthMapping | null> {
  const { mapping } = await loadSettings();
  return mapping ?? defaultMapping(useHabits.getState().habits);
}

export async function setHealthMapping(mapping: HealthMapping): Promise<void> {
  await saveSettings({ mapping });
}

async function readSessions(since: Date): Promise<HealthSession[]> {
  const out: HealthSession[] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'after', startTime: since.toISOString() },
      pageToken,
    });
    for (const r of page.records) {
      const id = r.metadata?.id;
      if (id) out.push({ id, exerciseType: r.exerciseType, title: r.title, startTime: r.startTime });
    }
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return out;
}

/** Sesiones de los últimos días, para ver cómo llegan (p. ej. el pádel). */
export async function recentSessions(): Promise<HealthSession[]> {
  if (!(await ensureClient()) || !(await hasPermission())) return [];
  const sessions = await readSessions(readSince(null, new Date())).catch(() => []);
  return sessions.sort((a, b) => b.startTime.localeCompare(a.startTime));
}

let running: Promise<number | null> | null = null;

/** Marca los entrenamientos nuevos. Devuelve cuántos días marcó, o null si no se pudo. */
export function syncHealth(): Promise<number | null> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<number | null> {
  const state = useHabits.getState();
  if (state.status !== 'ready' || !state.account) return null;
  const settings = await loadSettings();
  if (!settings.enabled || !(await ensureClient()) || !(await hasPermission())) return null;

  const now = new Date();
  let sessions: HealthSession[];
  try {
    sessions = await readSessions(readSince(settings.lastSync, now));
  } catch {
    return null;
  }

  // Los datos pueden haber cambiado mientras se leía.
  const data = useHabits.getState();
  if (data.status !== 'ready' || data.account?.id !== state.account.id) return null;
  const mapping = settings.mapping ?? defaultMapping(data.habits);
  const { marks, processed } = planMarks(sessions, mapping, data, new Set(Object.keys(settings.processed)), now);
  data.addSubtypeLogs(marks);

  const byId = Object.fromEntries(sessions.map((s) => [s.id, sessionDay(s)]));
  const done = { ...settings.processed, ...Object.fromEntries(processed.map((id) => [id, byId[id] ?? ''])) };
  await saveSettings({ lastSync: now.toISOString(), processed: pruneProcessed(done, now) });
  return marks.length;
}

let registered = false;

/** Sincroniza al terminar cada carga de datos y al volver a la app. */
export function registerHealthSync() {
  if (registered) return;
  registered = true;

  useHabits.subscribe((s, prev) => {
    if (s.status === 'ready' && prev.status !== 'ready') void syncHealth();
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncHealth();
  });
}
