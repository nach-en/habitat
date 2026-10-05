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
