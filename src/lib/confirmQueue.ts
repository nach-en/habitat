/**
 * Petición de confirmación pendiente para `ConfirmDialog`. En web se usa en
 * lugar de `window.confirm`, que algunos navegadores y vistas web no muestran
 * (lo dan por cancelado y el botón parece no hacer nada).
 */
export type ConfirmRequest = {
  title: string;
  message: string;
  action: string;
  resolve: (ok: boolean) => void;
};

let current: ConfirmRequest | null = null;
const listeners = new Set<(r: ConfirmRequest | null) => void>();

function emit() {
  listeners.forEach((l) => l(current));
}

export function subscribeConfirm(l: (r: ConfirmRequest | null) => void): () => void {
  listeners.add(l);
  l(current);
  return () => listeners.delete(l);
}

export function requestConfirm(title: string, message: string, action: string): Promise<boolean> {
  // Una petición nueva cancela la anterior.
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { title, message, action, resolve };
    emit();
  });
}

export function answerConfirm(ok: boolean) {
  const r = current;
  current = null;
  emit();
  r?.resolve(ok);
}
