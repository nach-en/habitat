# Decisiones

Decisiones no especificadas en `HABITAT.md`, por hito.

## Hito 1 · Esqueleto

- **Versiones**: Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6. Se añade `noUncheckedIndexedAccess` además de `strict`.
- **TypeScript 6** ya no incluye `@types/*` automáticamente: `tsconfig.json` declara `"types": ["jest"]`, y `css.d.ts` declara los imports de `.css`.
- **NativeWind 4.2.7** (estable, Tailwind 3). La v5 sigue en release candidate.
- **Modo oscuro**: los colores de tema son variables CSS en `global.css` que cambian con `@media (prefers-color-scheme: dark)`, así que las clases (`bg-bg`, `text-muted`…) siguen al sistema solas. `tailwind.config.js` usa `darkMode: 'class'` porque con `'media'` css-interop lanza un error en web. Para colores que no pasan por clases (Skia, colores por hábito) se usa `useTokens()` de `src/theme/tokens.ts`.
- **Rutas** en `app/` en la raíz (como en la spec), no en `src/app/`. Alias `@/` → `src/`.
- **Iconos**: Ionicons (`@expo/vector-icons`). Las 7 claves guardadas en BD son `water, run, book, leaf, moon, barbell, heart`.
- **Fuente**: `@expo-google-fonts/bricolage-grotesque` (archivos incluidos en el paquete, funciona sin red). La pantalla de bienvenida se mantiene hasta que carga la fuente.
- **Tipos**: el modelo de la app usa camelCase (`createdOn`, `timesPerWeek`…); el mapeo desde/hacia snake_case de Supabase se hará en el hito 5.
- **Identificador de app**: `com.nachen.habitat` (provisional, cámbialo si quieres otro).
- **Datos de ejemplo**: 3 hábitos (uno de cada frecuencia) con registros deterministas, en memoria, en `src/store/habits.ts`.
- **Fondo de tarjeta**: el "color al 6 % sobre la superficie" se calcula como color sólido mezclado (`blend`) en lugar de una capa con transparencia.
- **Verificación**: Xcode 26.3 necesita la plataforma iOS 26.x, que no está instalada (solo hay simuladores de iOS 17). El hito 1 se verificó en web (`expo start --web`).

## Hito 2 · Lógica pura

- Se añade **`src/lib/frequency.ts`** (no estaba en la estructura) con `isScheduled`, `weekCount`, `isDueToday` y `todayCounts`, que usan tanto `streaks.ts` como `grid.ts` y la cabecera.
- `cellState` está en `grid.ts`. Devuelve el estado base; el borde de "hoy" lo decide quien dibuja.
- Los **registros en días no programados** (tipo `days`) se dibujan como `done` pero no suman a la racha ni la rompen.
- Los **registros anteriores a `created_on`** se ignoran (celda `before`, no cuentan en rachas).
- **Semana de creación** (tipo `week`): solo cuentan los días desde `created_on`. Si no llega al objetivo no suma, pero como es la primera semana tampoco "rompe" nada.
- **Contador de cabecera** ("hechos hoy / pendientes hoy"): `daily`/`days` cuentan si hoy está programado; `week` cuenta si ya se hizo hoy o aún no se ha alcanzado el objetivo semanal. Los hábitos creados en el futuro no cuentan.
- **Toques en la cuadrícula**: `cellAt` asigna los toques en el hueco entre celdas a la celda anterior (más fácil de acertar en un canvas denso).
- Los tests usan fechas fijas (hoy = miércoles 2026-10-07) y pasan con distintas zonas horarias (UTC, Los Ángeles, Auckland).

## Hito 3 · Tarjeta y cuadrícula

- **Skia en web**: `HabitGrid.web.tsx` carga CanvasKit en diferido (`WithSkiaWeb`) antes de importar `HabitGridCanvas`; en nativo `HabitGrid.tsx` lo reexporta directamente. `npm run web` copia `canvaskit.wasm` a `public/` (ignorado en git).
- **Toques en la cuadrícula**: un `Pressable` envuelve el canvas y la celda se calcula con `cellAt` a partir de la posición del toque (en web, `offsetX/Y` porque el click no trae `locationX/Y`). Sin gesture-handler.
- **"Hoy"**: `useToday()` devuelve la clave del día y se actualiza a medianoche y al volver la app a primer plano.
- **Aspecto de celdas**: `before` es un punto de radio ≈ 8 % de la celda en `cell-faint`; el borde de hoy es de 1,5 pt en blanco/negro al 55 %.
- **Check**: sin marcar, fondo del color al 12 % y borde al 45 %; marcado, relleno del color con el tick en el color de la tarjeta. Animación de escala 0,86 → 1 (muelle), desactivada con "reducir movimiento".
- **Estadísticas**: "Racha N d" / "Mejor N d" (o `sem` en semanales) y "n/N esta semana".
- **Datos de ejemplo**: patrón pseudoaleatorio determinista que respeta los días programados.

## Hito 4 · Formulario

- **Plataforma objetivo**: Android (primero como webapp y después como APK). Por eso todo el formulario usa componentes que funcionan igual en Android y en web.
- **Hoja**: `presentation: 'modal'` con `animation: 'slide_from_bottom'` (en Android sube desde abajo; en web es una página). Barra propia con "Cancelar · título · Guardar".
- **Hora del recordatorio**: dos selectores −/+ (hora de 1 en 1, minutos de 5 en 5) en lugar de un selector nativo de hora, que no existe en web.
- **Validación** (`src/lib/validation.ts`, con tests): nombre obligatorio (máx. 40), descripción opcional (máx. 80), `days` necesita al menos un día, `week` entre 1 y 7 veces. Los errores se muestran al intentar guardar.
- **Confirmación de borrado**: `Alert.alert` en nativo y `window.confirm` en web (`src/lib/confirm.ts` / `.web.ts`), porque en web `Alert` no muestra botones.
- **Editar** no cambia `created_on` ni borra registros; si cambia la frecuencia, rachas y cuadrícula se recalculan con la nueva.
- **IDs** con `expo-crypto` `randomUUID()` (UUID v4, compatible con la columna `uuid` de Supabase).
- **Cerrar la hoja** (`closeSheet`): si no hay historial (URL abierta directamente en web), vuelve a `/`.

## Hito 5 · Supabase

- **Migración** (`supabase/migrations/0001_init.sql`): igual que la spec, más `user_id default auth.uid()`, índices por `user_id`, políticas `to authenticated` y la comprobación de que un registro apunta a un hábito del propio usuario. La app envía `created_on` con la fecha local (el `current_date` del servidor es UTC).
- **Sesión**: `@react-native-async-storage/async-storage` como almacenamiento (en web usa `localStorage`), en lugar de `expo-sqlite/localStorage` de la guía oficial, que en web necesita configuración extra.
- **Autenticación con email y contraseña** (cambio respecto a la spec, que pedía sesión anónima): igual que en Viborapp. Pantalla `app/login.tsx` con "Entrar" / "Crear cuenta" (`signInWithPassword` / `signUp`); sin sesión, el layout redirige a `/login`. Con "Confirm email" activado en Supabase, el registro pide confirmar el correo antes de entrar. Así los datos son los mismos en la webapp y en el APK con solo iniciar sesión.
- **Cuenta** (`app/account.tsx`): muestra el email y permite cerrar sesión (avisa si hay cambios sin sincronizar, que se perderían).
- **Sincronización** (`src/lib/outbox.ts`): cada cambio se aplica al instante en local (`applyOp`, puro y con tests) y se encola. La cola se guarda en AsyncStorage, se envía en orden y, si falla la red, se reintenta con espera exponencial (1 s … 60 s). Los errores de la BD (con código) no se reintentan: se descarta la operación y se muestra el aviso. Todas las operaciones son idempotentes (upsert / delete).
- **Carga inicial**: hábitos no archivados + registros paginados de 1000 en 1000; encima se aplican las operaciones aún pendientes, para no "deshacer" cambios offline.
- **Cambio de usuario** (cerrar sesión y entrar con otra cuenta): se vacía la cola y se cargan los datos del nuevo usuario.
- **Sin caché local de datos**: sin conexión al abrir la app se muestra el error con "Reintentar"; los cambios hechos con la app abierta sí sobreviven a cortes de red.

## Hito 6 · Recordatorios

- **Web**: `expo-notifications` no programa notificaciones locales en web. Allí el recordatorio se guarda en el hábito y el formulario avisa de que "llegan en la app de Android" (`notifications.web.ts` no hace nada). Al instalar el APK empiezan a funcionar sin más.
- **Lógica pura** (`src/lib/reminders.ts`, con tests): qué disparos programar (`days` → uno semanal por día elegido; `daily`/`week` → uno diario), el texto (título = nombre, cuerpo = descripción o "Es hora de tu hábito") y una huella para no reprogramar lo que no ha cambiado. Ojo: expo-notifications numera los días con 1 = domingo.
- **Reconciliación** (`syncReminders`): en lugar de programar/cancelar en cada pantalla, el store llama a `syncReminders(habits)` al crear/editar/borrar y tras cada carga. Compara con lo guardado (habitId → ids + huella, en AsyncStorage), cancela lo que sobra y programa lo que falta. Así también se recogen los cambios hechos desde otro dispositivo. Las llamadas se encadenan para no pisarse.
- **Permiso**: se pide al activar el interruptor por primera vez. Si se deniega, el interruptor vuelve a apagado y aparece un aviso con "Abrir ajustes" (`Linking.openSettings`). Si el permiso se retira después, los recordatorios simplemente no se programan.
- **Android**: canal "Recordatorios" con importancia alta. Al cerrar sesión se cancelan todos.
- **Verificado en Android 14 (emulador)**: permiso pedido al activar el interruptor, notificación recibida a la hora (Android la entregó con ~3 min de margen, por ser alarma inexacta), reprogramada para el día siguiente y cancelada al eliminar el hábito. El icono de la notificación es el genérico hasta el hito 7.

## Hito 7 · Pulido

- **Logo**: cuadrícula 3×3 como la de los hábitos; los siete colores forman una **H** y las dos celdas restantes quedan tenues (días sin marcar). Fondo `#0b0f10`. Fuente en `assets/brand/` (`logo.svg` y `make-icons.js`, que genera todas las variantes con resvg).
- **Variantes**: icono 1024, icono adaptativo Android (primer plano dentro de la zona segura, fondo oscuro y versión monocroma para iconos temáticos), icono de notificación blanco 96 px tintado con `#8b8cf5`, splash solo con la H sobre `#eceff0` / `#0b0f10` según el modo, favicon e iconos PWA (192, 512 y maskable).
- **Webapp instalable**: `public/manifest.json` y `public/index.html` (idioma `es`, `theme-color` por modo, fondo sin destello blanco). En Android, Chrome permite "Añadir a pantalla de inicio" y se abre a pantalla completa. (`+html.tsx` no sirve aquí: solo se usa con exportación estática.)
- **Modo claro/oscuro en Android**: `expo-system-ui`, necesario para que `userInterfaceStyle: automatic` funcione.
- **Accesibilidad de la cuadrícula**: como es un único canvas, se expone como control *ajustable*: el lector de pantalla anuncia "Historial de X, lunes 5 de octubre: hecho"; deslizar arriba/abajo cambia de día (sin salir de `created_on`…hoy) y tocar dos veces marca o desmarca. El check ya anunciaba su estado.
- **Errores de red**: además del aviso de sincronización y del error de carga inicial, si falla una recarga con hábitos ya en pantalla aparece un aviso. Deslizar hacia abajo recarga.
- **EAS**: `eas.json` con perfil `preview` que genera un APK (`buildType: apk`).
