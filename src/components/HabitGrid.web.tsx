import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { HabitGridProps } from './HabitGridCanvas';

export type { HabitGridProps };

// En web, Skia necesita cargar CanvasKit (public/canvaskit.wasm) antes de
// importar cualquier componente que lo use.
export function HabitGrid(props: HabitGridProps) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./HabitGridCanvas')}
      componentProps={props}
    />
  );
}
