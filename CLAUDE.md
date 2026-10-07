# Habitat — convenciones

App móvil de hábitos. La especificación completa está en `HABITAT.md`; las decisiones no especificadas se anotan en `DECISIONS.md`.

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript estricto (`strict`, `noUncheckedIndexedAccess`).
- `expo-router` para navegación (rutas en `app/`, en la raíz).
- NativeWind 4 (Tailwind 3) para estilos. Colores de tema como variables en `global.css`.
- `@shopify/react-native-skia` para la cuadrícula: **un solo canvas por tarjeta**, nunca cientos de `View`.
- Supabase (Auth con email y contraseña + Postgres) para persistencia y sincronización. Sin sesión se redirige a `/login`.
- `expo-notifications` (recordatorios locales), `expo-haptics` (háptico).
- Estado: Zustand. Fechas: `date-fns`.
- Tests: Jest (`jest-expo`) solo para lógica pura.

Expo cambia mucho entre SDK: antes de usar una API de Expo/RN, consulta la documentación versionada (`https://docs.expo.dev/versions/v57.0.0/`). Instala dependencias con `npx expo install <paquete>`, no con `npm install`.

## Estructura

```
app/                  rutas (expo-router): _layout, index, login, account, habit/new, habit/[id]
src/components/       HabitCard, CheckButton, HabitGrid (Skia), HabitForm, SubtypePicker, Chip, icons.ts
src/lib/              dates, frequency, streaks, grid, ops, rows, subtypes, validation (puros) · supabase, auth, outbox, notifications
src/store/habits.ts   Zustand + sincronización con Supabase
src/theme/tokens.ts   tokens de color, medidas, fuentes
src/types.ts          tipos compartidos
supabase/migrations/  SQL
__tests__/            tests de la lógica pura
```

Importa desde `src/` con el alias `@/` (p. ej. `@/lib/streaks`).

## Lógica clave

- La semana empieza en **lunes**; `dow(d)` devuelve 0 = lunes … 6 = domingo.
- Los días se representan como `DayKey` = `'yyyy-MM-dd'` en hora local, sin zona horaria. Convierte con `toKey` / `fromKey` de `@/lib/dates`.
- Un registro en `habit_logs` = "hecho ese día", opcionalmente con `subtype_id` (puede haber varios por día; `null` = sin subtipo). Desmarcar el día = borrar todas sus filas.
- Escrituras siempre optimistas: `commit(op)` en el store aplica `applyOp` en local y encola la operación en `outbox` (persistente, con reintento).
- Plataforma principal: Android (webapp primero, APK después). Todo debe funcionar también en web.
- Día programado: `daily` todos; `days` si `dow(d)` está en `days`; `week` cualquiera.
- Estado de celda: `future` (> hoy), `before` (< `created_on`), `done`, `missed` (programado, pasado, sin registro; solo `daily`/`days`), `idle`. "Hoy" se dibuja como borde encima del estado.
- Rachas: `daily`/`days` cuentan días programados consecutivos con registro; hoy sin marcar no rompe. `week` cuenta semanas consecutivas que alcanzan `times_per_week`; la semana en curso no rompe. La mejor racha se calcula hacia delante desde `created_on`.
- Los días anteriores a `created_on` nunca cuentan como fallo. Solo se pueden alternar días entre `created_on` y hoy.
- La lógica pura (`dates`, `frequency`, `streaks`, `grid`) no importa nada de React ni de Expo y lleva tests.

## Comandos

```bash
npm test              # jest
npm run typecheck     # tsc --noEmit
npx expo start        # servidor de desarrollo
npx expo run:ios      # dev build (necesario por Skia/Reanimated)
```

Antes de dar un hito por terminado: `npm test` y `npm run typecheck` sin errores, y commit.
