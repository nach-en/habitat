// Health Connect solo existe en Android (index.android.ts); aquí no hace nada.
import type { HealthMapping, HealthSession } from '@/lib/health';

/** 'unsupported': no es Android. 'unavailable': Health Connect no está instalado o hay que actualizarlo. */
export type HealthStatus = 'unsupported' | 'unavailable' | 'disconnected' | 'connected';

export const healthSupported = false;

export async function healthStatus(): Promise<HealthStatus> {
  return 'unsupported';
}

export async function connectHealth(): Promise<boolean> {
  return false;
}

export async function disconnectHealth(): Promise<void> {}

export async function getHealthMapping(): Promise<HealthMapping | null> {
  return null;
}

export async function setHealthMapping(_mapping: HealthMapping): Promise<void> {}

export async function syncHealth(): Promise<number | null> {
  return null;
}

export async function recentSessions(): Promise<HealthSession[]> {
  return [];
}

export function registerHealthSync() {}
