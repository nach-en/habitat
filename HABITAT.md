# Habitat: especificación para Claude Code

App móvil para registrar hábitos personales. Cada hábito es una tarjeta con su color y una cuadrícula de cuadraditos estilo GitHub que muestra el historial de un vistazo.

> Instrucción para Claude Code: lee este documento entero antes de escribir código. Trabaja por hitos (sección 9), haz commit al terminar cada uno y no pases al siguiente hasta que el actual compile y funcione. Si una decisión no está especificada, elige la opción más simple y anótala en `DECISIONS.md`.

---

## 1. Alcance del MVP

Cuatro funcionalidades, y nada más:

1. **Crear y editar hábitos** con nombre, descripción corta, icono, color y frecuencia (cada día, días concretos, X veces por semana).
2. **Marcar como hecho con un toque** (check grande a la derecha de la tarjeta, con háptico y animación).
3. **Rachas e historial** con cuadrícula tipo GitHub por hábito. Tocar un cuadrado alterna ese día (para corregir días pasados).
4. **Recordatorios** locales por hábito, con hora configurable.

Fuera del MVP (no implementar): funciones con IA, widgets, hábitos encadenados, retos, estadísticas avanzadas, modo social.

## 2. Stack

- Expo (SDK actual) + React Native + TypeScript estricto
- `expo-router` para la navegación
- NativeWind para estilos
- `@shopify/react-native-skia` para dibujar la cuadrícula (un solo canvas por tarjeta, no cientos de `View`)
- Supabase (Auth + Postgres) para persistencia y sincronización
- `expo-notifications` para recordatorios locales, `expo-haptics` para el háptico
- Estado: Zustand. Fechas: `date-fns`
- Tests: Jest para la lógica pura (rachas, cuadrícula, frecuencia)

## 3. Estructura del proyecto

```
habitat/
├─ app/                      # rutas (expo-router)
│  ├─ _layout.tsx
│  ├─ index.tsx              # pantalla principal: lista de tarjetas
│  └─ habit/
│     ├─ new.tsx             # hoja de creación
│     └─ [id].tsx            # hoja de edición
├─ src/
│  ├─ components/
│  │  ├─ HabitCard.tsx
│  │  ├─ CheckButton.tsx
│  │  ├─ HabitGrid.tsx       # canvas Skia
│  │  ├─ HabitForm.tsx
│  │  └─ icons.ts            # mapa nombre → icono
│  ├─ lib/
│  │  ├─ supabase.ts
│  │  ├─ dates.ts            # lunes como inicio de semana
│  │  ├─ streaks.ts          # lógica pura (sección 6)
│  │  ├─ grid.ts             # lógica pura de estado de celdas
│  │  └─ notifications.ts
│  ├─ store/
│  │  └─ habits.ts           # Zustand + sincronización con Supabase
│  ├─ theme/
│  │  └─ tokens.ts
│  └─ types.ts
├─ supabase/
│  └─ migrations/0001_init.sql
├─ __tests__/
│  ├─ streaks.test.ts
│  └─ grid.test.ts
├─ DECISIONS.md
└─ CLAUDE.md                 # resumen de convenciones (copiar de aquí)
```

## 4. Modelo de datos (Supabase)

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null,                      -- hex, ej. '#8b8cf5'
  icon text not null,                       -- clave del mapa de iconos
  frequency text not null check (frequency in ('daily','days','week')),
  days smallint[] not null default '{}',    -- 0=lunes ... 6=domingo (solo si 'days')
  times_per_week smallint not null default 3,
  reminder_enabled boolean not null default false,
  reminder_time time not null default '08:00',
  created_on date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  unique (habit_id, day)
);

alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "own habits" on habits
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logs" on habit_logs
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- Un registro en `habit_logs` significa "hecho ese día". Desmarcar = borrar la fila.
- `day` es una fecha local del usuario (sin zona horaria).
- Autenticación del MVP: inicio de sesión anónimo de Supabase, con opción de vincular email más adelante.
- Actualizaciones optimistas: la UI cambia al instante y la escritura va en segundo plano con reintento.

## 5. Pantallas

**Principal (`index`)**
- Cabecera: nombre "Habitat", fecha de hoy y contador "hechos hoy / pendientes hoy".
- Lista vertical de `HabitCard`.
- Botón flotante "Nuevo hábito".
- Estado vacío: "Aún no tienes hábitos. Crea el primero con el botón de abajo."

**`HabitCard`**
- Fila superior: tile con icono (color del hábito al 17 % de opacidad), nombre, descripción (una línea, con elipsis) y `CheckButton` a la derecha. Tocar nombre/descripción abre la edición.
- Cuadrícula debajo (20 semanas por defecto).
- Fila inferior: "Racha X", "Mejor Y" y, si es de tipo semanal, "n/N esta semana".
- Fondo de la tarjeta: color del hábito al 6 % sobre la superficie, borde del color al 20 %.

**Hoja de creación/edición** (modal desde abajo)
- Campos: nombre (obligatorio), descripción, color (7 opciones), icono (7 opciones), frecuencia, recordatorio (interruptor + hora).
- En edición: botón "Eliminar" con confirmación.

## 6. Lógica clave (implementar como funciones puras y con tests)

Convenciones: la semana empieza en lunes, `dow(d)` devuelve 0 para lunes y 6 para domingo.

**Día programado**
- `daily`: todos los días.
- `days`: si `dow(d)` está en `days`.
- `week`: no hay días fijos, cualquier día vale.

**Estado de cada celda** (la cuadrícula es una columna por semana y una fila por día, lunes arriba)
| Estado | Condición | Aspecto |
|---|---|---|
| `future` | día > hoy | no se dibuja |
| `before` | día < `created_on` | punto muy pequeño y casi invisible |
| `done` | hay registro ese día | color del hábito, relleno |
| `missed` | programado, pasado, sin registro (solo `daily` y `days`) | gris tenue |
| `idle` | no programado, o tipo `week` sin registro | gris casi invisible |
| hoy | día == hoy | borde fino sobre cualquiera de los anteriores |

Los días anteriores a la creación nunca cuentan como fallo.

**Rachas** (`streaks.ts`)
- `daily` y `days`: se cuentan días programados consecutivos con registro. Los días no programados se saltan sin romper la racha. El día de hoy sin registrar todavía **no rompe** la racha, pero cualquier día programado anterior sin registro sí.
- `week`: la racha se cuenta en **semanas** consecutivas que alcanzan `times_per_week`. La semana en curso no rompe la racha mientras no haya terminado.
- La mejor racha se calcula con un recorrido hacia delante desde `created_on`.

Firma sugerida:

```ts
export type Streak = { current: number; best: number; unit: 'd' | 'sem' };
export function computeStreak(habit: Habit, logs: Set<string>, today: Date): Streak;
export function cellState(habit: Habit, day: Date, logs: Set<string>, today: Date): CellState;
```

Casos mínimos de test: hábito nuevo sin registros, racha que cruza días no programados, hoy sin marcar, semana en curso incompleta, desmarcar un día pasado que parte una racha en dos.

## 7. Recordatorios

- Al guardar un hábito con recordatorio activado, programar una notificación local repetitiva a la hora indicada. En `days`, una por cada día de la semana elegido; en `daily` y `week`, una diaria.
- Guardar el identificador de cada notificación para cancelarla o reprogramarla al editar o eliminar.
- Pedir permiso de notificaciones la primera vez que se activa un recordatorio, no al abrir la app.
- Si el permiso se deniega, mostrar un aviso con acceso a los ajustes del sistema y dejar el hábito funcionando sin recordatorio.
- Texto de la notificación: título = nombre del hábito, cuerpo = descripción (o "Es hora de tu hábito" si está vacía).

## 8. Diseño

Referencia visual: el prototipo interactivo de la conversación (tarjetas con color propio, check grande, cuadrícula de cuadraditos). Respetar el modo claro y oscuro del sistema.

**Tokens**
| Token | Oscuro | Claro |
|---|---|---|
| `bg` | `#0b0f10` | `#eceff0` |
| `card` | `#14191b` | `#ffffff` |
| `text` | `#edf1ef` | `#14191b` |
| `muted` | `#8a9693` | `#667177` |
| `cell-off` | blanco al 7,5 % | negro al 7 % |
| `cell-faint` | blanco al 3,5 % | negro al 3,5 % |

Colores de hábito: `#8b8cf5`, `#f2a03d`, `#ee6a7e`, `#3cc7b0`, `#7fc95a`, `#d98af0`, `#5aa9f2`.

**Medidas**
- Tarjeta: radio 24, padding 16. Tile de icono: 44, radio 14. Check: 48, radio 15.
- Celdas: cuadradas, separación 3, radio ≈ 3,5. La cuadrícula ocupa todo el ancho de la tarjeta.
- Tipografía: Bricolage Grotesque (con `expo-font`), pesos 400, 500 y 700. Título de tarjeta 17/500, descripción 13,5 en `muted`.

**Interacción**
- Al marcar el check: háptico ligero (`Haptics.impactAsync(Light)`) y una animación breve de escala del botón.
- Tocar una celda alterna ese día solo si está entre `created_on` y hoy.
- Respetar "reducir movimiento" del sistema.
- Zonas táctiles mínimas de 44 pt para botones (las celdas son la excepción, por ser un canvas denso).

## 9. Hitos

1. **Esqueleto**: proyecto Expo con TypeScript, expo-router, NativeWind, tokens de tema y fuente. Pantalla principal con datos de ejemplo en memoria.
2. **Lógica pura**: `dates.ts`, `streaks.ts`, `grid.ts` con tests pasando.
3. **Tarjeta y cuadrícula**: `HabitCard`, `CheckButton` y `HabitGrid` en Skia con datos locales. Toggle de hoy y de días pasados.
4. **Formulario**: crear, editar y eliminar hábitos (estado local con Zustand).
5. **Supabase**: migración, auth anónima, lectura y escritura con actualizaciones optimistas, y carga inicial.
6. **Recordatorios**: permisos, programación y cancelación según la sección 7.
7. **Pulido**: estados vacíos, errores de red visibles, modo claro/oscuro, accesibilidad (`accessibilityLabel` en check y celdas) e icono/splash.

## 10. Criterios de aceptación

- Crear un hábito de cada tipo de frecuencia y ver su cuadrícula correcta desde el primer día.
- Marcar y desmarcar hoy actualiza la racha y el contador de cabecera al instante.
- Corregir un día pasado recalcula la racha actual y la mejor.
- Los datos persisten tras cerrar la app y se ven igual al iniciar sesión en otro dispositivo.
- Un recordatorio llega a la hora configurada y se cancela al eliminar el hábito.
- Los tests de lógica pasan y `tsc` no da errores.

---

## Prompt inicial para pegar en Claude Code

```
Lee HABITAT.md completo. Vamos a construir la app desde cero siguiendo sus hitos.
Empieza por el hito 1 (esqueleto) y el hito 2 (lógica pura con tests).
Al terminar cada hito, resume lo que hiciste y qué decisiones tomaste, y espera mi OK antes de seguir.
Crea también un CLAUDE.md con las convenciones de la sección 2, 3 y 6.
```
