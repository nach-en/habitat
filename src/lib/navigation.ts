import { router } from 'expo-router';

/** Cierra la hoja actual; si se abrió por URL directa (web), vuelve al inicio. */
export function closeSheet() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
