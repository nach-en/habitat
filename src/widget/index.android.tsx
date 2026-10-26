import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetRepresentation,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import { useHabits } from '@/store/habits';
import { applyOp, type HabitsData } from '@/lib/ops';
import { enqueue, subscribeOutbox } from '@/lib/outbox';
import { fromSnapshot, todayRows, todaySummary, toSnapshot, widgetToggle } from '@/lib/widget';
import { TOGGLE, TodayWidget } from './TodayWidget';

/**
 * Widget "Hoy" (solo Android). Sus toques llegan a un task handler que puede
 * ejecutarse sin la app abierta: entonces el store no está cargado y se usa
 * la copia guardada en AsyncStorage, que el store mantiene al día.
 */

/** Nombre del widget en app.json. */
export const WIDGET_NAME = 'HabitatToday';

const SNAPSHOT_KEY = 'habitat.widget.v1';
/** Tiempo máximo esperando a que un toque llegue a Supabase antes de acabar la tarea. */
const SYNC_WAIT = 10_000;

/** Datos actuales: los del store si están cargados; si no, la copia; null sin sesión. */
async function currentData(): Promise<HabitsData | null> {
  const s = useHabits.getState();
  if (s.status === 'ready' && s.account) return s;
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY).catch(() => null);
  return raw ? fromSnapshot(raw) : null;
}

async function view(): Promise<WidgetRepresentation> {
  const data = await currentData();
  const today = new Date();
  const rows = data && todayRows(data, today);
  const summary = data ? todaySummary(data, today) : { done: 0, total: 0 };
  return {
    light: <TodayWidget scheme="light" rows={rows} summary={summary} />,
    dark: <TodayWidget scheme="dark" rows={rows} summary={summary} />,
  };
}

/** Hasta que la cola esté vacía o falle (se reintentará al abrir la app), o `ms`. */
function waitForSync(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const done = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(done, ms);
    unsubscribe = subscribeOutbox((s) => {
      if (s.pending === 0 || s.error) done();
    });
  });
}

/**
 * Marca o desmarca hoy. Termina con el cambio ya aplicado en local; `synced`
 * termina cuando se ha intentado enviar.
 */
async function toggle(habitId: string): Promise<{ synced: Promise<void> }> {
  const today = new Date();
  const s = useHabits.getState();
  if (s.status === 'ready' && s.account) {
    // App abierta (o en segundo plano) en este mismo proceso: lo hace el store.
    const op = widgetToggle(s, habitId, today);
    if (op?.kind === 'setLog') s.toggleLog(habitId, op.day);
    return { synced: Promise.resolve() };
  }
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY).catch(() => null);
  const data = fromSnapshot(raw);
  const op = widgetToggle(data, habitId, today);
  if (!op) return { synced: Promise.resolve() };
  // Igual que en la app: primero en local y a la cola; el store la aplicará al recargar.
  await AsyncStorage.setItem(SNAPSHOT_KEY, toSnapshot(applyOp(data, op))).catch(() => {});
  const synced = waitForSync(SYNC_WAIT);
  void enqueue(op);
  return { synced };
}

/** Los toques se atienden de uno en uno, en orden. */
let queue: Promise<unknown> = Promise.resolve();

async function handle({ widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  if (widgetAction === 'WIDGET_CLICK' && clickAction === TOGGLE) {
    const habitId = clickActionData?.habitId;
    if (typeof habitId === 'string') {
      const { synced } = await toggle(habitId);
      // Se redibuja al instante y después se espera al envío.
      renderWidget(await view());
      await synced;
      return;
    }
  }
  renderWidget(await view());
}

function refresh() {
  void requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: view }).catch(() => {});
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Guarda la copia y redibuja, agrupando cambios seguidos. */
function scheduleSave() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    const s = useHabits.getState();
    if (s.status !== 'ready' || !s.account) return;
    void AsyncStorage.setItem(SNAPSHOT_KEY, toSnapshot(s))
      .catch(() => {})
      .then(refresh);
  }, 400);
}

/** Registra el widget. Se llama al arrancar el bundle, antes que la app. */
export function registerWidget() {
  if (Platform.OS !== 'android') return;

  registerWidgetTaskHandler((props) => {
    const run = queue.then(() => handle(props));
    queue = run.catch(() => {});
    return run;
  });

  useHabits.subscribe((s, prev) => {
    if (s.account === null && prev.account) {
      // Sin sesión el widget no debe enseñar datos del usuario anterior.
      void AsyncStorage.removeItem(SNAPSHOT_KEY).catch(() => {}).then(refresh);
      return;
    }
    if (s.status !== 'ready') return;
    if (prev.status === 'ready' && s.habits === prev.habits && s.logs === prev.logs) return;
    scheduleSave();
  });

  // Al volver a la app (quizá otro día) se redibuja con la fecha nueva.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') refresh();
  });
}
