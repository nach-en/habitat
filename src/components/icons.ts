import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Clave guardada en BD → nombre de Ionicons. */
export const icons = {
  water: 'water',
  run: 'walk',
  book: 'book',
  leaf: 'leaf',
  moon: 'moon',
  barbell: 'barbell',
  heart: 'heart',
} as const satisfies Record<string, IoniconName>;

export type IconKey = keyof typeof icons;

export const iconKeys = Object.keys(icons) as IconKey[];

export function iconName(key: string): IoniconName {
  return icons[key as IconKey] ?? 'ellipse';
}
