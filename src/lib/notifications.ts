import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { reminderContent, reminderFingerprint, reminderTriggers } from './reminders';
import type { Habit } from '@/types';

// Recordatorios locales (HABITAT.md §7). En web ver notifications.web.ts.

export const remindersSupported = true;

export type PermissionResult = 'granted' | 'denied';

const CHANNEL_ID = 'reminders';
const KEY = 'habitat.reminders.v1';

/** habitId → identificadores programados y huella de lo programado. */
type Scheduled = Record<string, { ids: string[]; fingerprint: string }>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<void> | null = null;
function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.HIGH,
  }).then(() => undefined);
  return channelReady;
}

async function readScheduled(): Promise<Scheduled> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Scheduled;
  } catch {
    return {};
  }
}

async function writeScheduled(s: Scheduled): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Pide permiso si aún no se ha decidido. Se llama al activar un recordatorio, no al abrir la app. */
export async function requestPermission(): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  await ensureChannel(); // En Android 13+ el diálogo aparece al crear el primer canal.
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

export function openSystemSettings(): void {
  void Linking.openSettings();
}

async function cancelIds(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

async function schedule(habit: Habit): Promise<string[]> {
  await ensureChannel();
  const content = { ...reminderContent(habit), data: { habitId: habit.id } };
  return Promise.all(
    reminderTriggers(habit).map(({ hour, minute, weekday }) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger:
          weekday === undefined
            ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID }
            : {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
                channelId: CHANNEL_ID,
              },
      }),
    ),
  );
}

// Las operaciones se encadenan para que dos cambios seguidos no se pisen.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

/**
 * Deja programados exactamente los recordatorios de `habits` (al guardar,
 * al cargar los datos o al cambiar de usuario). Cancela los de hábitos que
 * ya no están y no toca los que no han cambiado.
 */
export function syncReminders(habits: Habit[]): Promise<void> {
  return serial(async () => {
    const scheduled = await readScheduled();
    const granted = await hasPermission();
    const next: Scheduled = {};

    for (const habit of habits) {
      const fingerprint = reminderFingerprint(habit);
      const prev = scheduled[habit.id];
      const wanted = granted && habit.reminderEnabled;
      if (prev && prev.fingerprint === fingerprint && wanted && prev.ids.length > 0) {
        next[habit.id] = prev;
        continue;
      }
      if (prev) await cancelIds(prev.ids);
      if (wanted) next[habit.id] = { ids: await schedule(habit), fingerprint };
    }

    for (const [id, prev] of Object.entries(scheduled)) {
      if (!(id in next) && !habits.some((h) => h.id === id)) await cancelIds(prev.ids);
    }

    await writeScheduled(next);
  });
}

/** Cancela todos los recordatorios (al cerrar sesión). */
export function cancelAllReminders(): Promise<void> {
  return serial(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await writeScheduled({});
  });
}
