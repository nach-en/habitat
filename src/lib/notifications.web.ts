import type { Habit } from '@/types';

// En web, expo-notifications no programa notificaciones locales: el
// recordatorio se guarda en el hábito y empieza a funcionar en la app Android.

export const remindersSupported = false;

export type PermissionResult = 'granted' | 'denied';

export async function requestPermission(): Promise<PermissionResult> {
  return 'granted';
}

export function openSystemSettings(): void {}

export async function syncReminders(_habits: Habit[]): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}
