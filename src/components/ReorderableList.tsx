import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { centers, dropIndex, dropOffset, shiftFor } from '@/lib/order';

/** Pulsación antes de que la tarjeta se pueda arrastrar (si el dedo se mueve antes, es scroll). */
const LONG_PRESS = 350;
/** Distancia al borde de la pantalla en la que el arrastre hace scroll, y velocidad máxima (px/frame). */
const EDGE = 96;
const SPEED = 14;

type Props<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  onMove: (from: number, to: number) => void;
  /** Separación entre elementos. */
  gap: number;
  header?: ReactNode;
  /** Se muestra en lugar de la lista si `data` está vacía. */
  empty?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** Estado del arrastre compartido con el hilo de UI. */
type Drag = {
  /** Índice que se arrastra (-1: ninguno) y dónde quedaría. */
  active: SharedValue<number>;
  target: SharedValue<number>;
  /** Desplazamiento de la tarjeta arrastrada desde su sitio. */
  dy: SharedValue<number>;
  /** Soltada: va hacia su hueco y ya no sigue al dedo. */
  settling: SharedValue<boolean>;
  /** Claves y alturas en el orden actual. */
  order: SharedValue<string[]>;
  heights: SharedValue<number[]>;
};

/**
 * Lista vertical que se reordena manteniendo pulsado un elemento y arrastrándolo.
 * Pensada para pocas decenas de elementos: los renderiza todos (sin virtualizar).
 */
export function ReorderableList<T>({
  data,
  keyOf,
  renderItem,
  onMove,
  gap,
  header,
  empty,
  refreshControl,
  contentContainerStyle,
}: Props<T>) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollOffset(scrollRef);
  const viewportH = useSharedValue(0);
  const contentH = useSharedValue(0);
  const startScroll = useSharedValue(0);
  /** Traslación del dedo y su posición en pantalla. */
  const translation = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const drag: Drag = {
    active: useSharedValue(-1),
    target: useSharedValue(-1),
    dy: useSharedValue(0),
    settling: useSharedValue(false),
    order: useSharedValue<string[]>([]),
    heights: useSharedValue<number[]>([]),
  };
  const { active, target, dy, settling, order, heights } = drag;
  const [dragging, setDragging] = useState(false);

  // Alturas por clave (las posiciones se deducen de ellas: en web onLayout no avisa si solo cambia la posición).
  const heightByKey = useRef(new Map<string, number>());
  const keys = data.map(keyOf);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const syncHeights = useCallback(() => {
    order.value = keysRef.current;
    heights.value = keysRef.current.map((k) => heightByKey.current.get(k) ?? 0);
  }, [order, heights]);
  const onHeight = useCallback(
    (key: string, h: number) => {
      heightByKey.current.set(key, h);
      syncHeights();
    },
    [syncHeights],
  );

  /** Recoloca la tarjeta arrastrada y calcula dónde quedaría. */
  const follow = useCallback(
    (scroll: number) => {
      'worklet';
      const from = active.value;
      if (from < 0 || settling.value) return;
      dy.value = translation.value + scroll - startScroll.value;
      const mids = centers(heights.value, gap);
      target.value = dropIndex(mids, from, (mids[from] ?? 0) + dy.value);
    },
    [active, settling, dy, translation, startScroll, heights, gap, target],
  );

  // Cerca de los bordes, la lista se desplaza sola.
  const autoScroll = useFrameCallback(() => {
    'worklet';
    if (active.value < 0 || settling.value) return;
    const y = fingerY.value;
    const bottom = viewportH.value - EDGE;
    const step = y < EDGE ? -SPEED * Math.min(1, (EDGE - y) / EDGE) : y > bottom ? SPEED * Math.min(1, (y - bottom) / EDGE) : 0;
    if (step === 0) return;
    const max = Math.max(0, contentH.value - viewportH.value);
    const next = Math.min(max, Math.max(0, scrollY.value + step));
    if (next === scrollY.value) return;
    scrollTo(scrollRef, 0, next, false);
    follow(next);
  }, false);

  const reset = useCallback(() => {
    autoScroll.setActive(false);
    active.value = -1;
    target.value = -1;
    dy.value = 0;
    settling.value = false;
    setDragging(false);
  }, [autoScroll, active, target, dy, settling]);

  // Tras mover, se vuelve al estado normal cuando la lista ya está en el nuevo orden.
  const resetAfterMove = useRef(false);
  const keysSig = keys.join('|');
  useLayoutEffect(() => {
    syncHeights();
    if (resetAfterMove.current) {
      resetAfterMove.current = false;
      reset();
    }
  }, [keysSig, syncHeights, reset]);

  const onStart = useCallback(() => {
    setDragging(true);
    autoScroll.setActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [autoScroll]);

  const onDrop = useCallback(
    (from: number, to: number) => {
      if (from === to) return reset();
      resetAfterMove.current = true;
      onMove(from, to);
    },
    [onMove, reset],
  );

  // Gestos estables (inicio se repinta con cada cambio de sincronización): cada uno
  // busca su índice actual por clave en `order` en lugar de capturarlo.
  const gestureFor = useCallback(
    (key: string) =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS)
        .onStart((e) => {
          const index = order.value.indexOf(key);
          if (index < 0 || active.value >= 0) return;
          active.value = index;
          target.value = index;
          settling.value = false;
          startScroll.value = scrollY.value;
          translation.value = 0;
          fingerY.value = e.absoluteY;
          dy.value = 0;
          scheduleOnRN(onStart);
        })
        .onUpdate((e) => {
          if (order.value[active.value] !== key) return;
          translation.value = e.translationY;
          fingerY.value = e.absoluteY;
          follow(scrollY.value);
        })
        .onFinalize(() => {
          const index = active.value;
          if (order.value[index] !== key || settling.value) return;
          settling.value = true;
          const to = target.value;
          dy.value = withTiming(dropOffset(heights.value, gap, index, to), { duration: 160 }, () => {
            scheduleOnRN(onDrop, index, to);
          });
        }),
    [active, target, settling, startScroll, scrollY, translation, fingerY, dy, order, heights, gap, follow, onStart, onDrop],
  );

  return (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEnabled={!dragging}
      refreshControl={refreshControl}
      contentContainerStyle={contentContainerStyle}
      onLayout={(e) => (viewportH.value = e.nativeEvent.layout.height)}
      onContentSizeChange={(_w, h) => (contentH.value = h)}
    >
      {header}
      {data.length === 0 ? (
        empty
      ) : (
        <View style={{ gap }}>
          {data.map((item, index) => {
            const key = keys[index]!;
            return (
              <Item key={key} id={key} gap={gap} drag={drag} makeGesture={gestureFor} onHeight={onHeight}>
                {renderItem(item)}
              </Item>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
}

type ItemProps = {
  id: string;
  gap: number;
  drag: Drag;
  makeGesture: (key: string) => ReturnType<typeof Gesture.Pan>;
  onHeight: (key: string, h: number) => void;
  children: ReactNode;
};

function Item({ id, gap, drag, makeGesture, onHeight, children }: ItemProps) {
  const gesture = useMemo(() => makeGesture(id), [makeGesture, id]);
  const { active, target, dy, settling, order, heights } = drag;
  const style = useAnimatedStyle(() => {
    const a = active.value;
    const index = order.value.indexOf(id);
    if (a < 0) return { zIndex: 0, transform: [{ translateY: 0 }, { scale: 1 }] };
    if (a === index) {
      return {
        zIndex: 10,
        transform: [{ translateY: dy.value }, { scale: withTiming(settling.value ? 1 : 1.03, { duration: 150 }) }],
      };
    }
    const size = (heights.value[a] ?? 0) + gap;
    return {
      zIndex: 0,
      transform: [{ translateY: withTiming(shiftFor(index, a, target.value, size), { duration: 180 }) }, { scale: 1 }],
    };
  });
  const onLayout = useMemo(() => (e: LayoutChangeEvent) => onHeight(id, e.nativeEvent.layout.height), [id, onHeight]);

  return (
    // pan-y: en web táctil se puede seguir haciendo scroll empezando sobre una tarjeta.
    <GestureDetector gesture={gesture} touchAction="pan-y" userSelect="none">
      <Animated.View style={style} onLayout={onLayout}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
