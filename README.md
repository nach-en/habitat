# Habitat

App de seguimiento de hábitos: cada hábito es una tarjeta con su color y una cuadrícula estilo GitHub con el historial. Pensada para Android (webapp y APK).

Especificación: [HABITAT.md](HABITAT.md) · Decisiones: [DECISIONS.md](DECISIONS.md) · Convenciones: [CLAUDE.md](CLAUDE.md)

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env` con la URL y la anon key de tu proyecto de Supabase.
3. Aplica `supabase/migrations/0001_init.sql` en el editor SQL de Supabase.

## Ejecutar

```bash
npm run web          # webapp en http://localhost:8081 (copia también canvaskit.wasm)
npx expo run:android # dev build en emulador o dispositivo (necesita JDK 17 y Android SDK)
npm test             # tests de la lógica pura
npm run typecheck
```

## Webapp en Vercel

El repo está listo para importarlo en Vercel (`vercel.json`): compila con `npm run build:web` (copia `canvaskit.wasm` y ejecuta `expo export`) y publica `dist/`. En el proyecto de Vercel hay que definir `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`, y añadir el dominio en Supabase → Authentication → URL Configuration.

## APK

Con una cuenta de Expo:

```bash
npx eas-cli@latest build -p android --profile preview
```

Genera un APK instalable directamente en el móvil. Los recordatorios solo funcionan en la app Android; en la webapp se guardan pero no avisan.

## Iconos

El logo (una H formada por los siete colores de hábito sobre la cuadrícula) está en `assets/brand/`. `make-icons.js` regenera todos los PNG de `assets/` y `public/`.
