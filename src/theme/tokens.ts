import { useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';

export type Palette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  cellOff: string;
  cellFaint: string;
};

// Mantener sincronizado con las variables de global.css.
export const palettes: Record<Scheme, Palette> = {
  dark: {
    bg: '#0b0f10',
    card: '#14191b',
    text: '#edf1ef',
    muted: '#8a9693',
    cellOff: 'rgba(255,255,255,0.075)',
    cellFaint: 'rgba(255,255,255,0.035)',
  },
  light: {
    bg: '#eceff0',
    card: '#ffffff',
    text: '#14191b',
    muted: '#667177',
    cellOff: 'rgba(0,0,0,0.07)',
    cellFaint: 'rgba(0,0,0,0.035)',
  },
};

export const habitColors = [
  '#8b8cf5',
  '#f2a03d',
  '#ee6a7e',
  '#3cc7b0',
  '#7fc95a',
  '#d98af0',
  '#5aa9f2',
] as const;

export const sizes = {
  cardRadius: 24,
  cardPadding: 16,
  iconTile: 44,
  iconTileRadius: 14,
  check: 48,
  checkRadius: 15,
  cellGap: 3,
  cellRadius: 3.5,
  gridWeeks: 20,
  minTouch: 44,
} as const;

export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  bold: 'BricolageGrotesque_700Bold',
} as const;

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** `hex` con opacidad `alpha` (0–1) como cadena rgba. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Color sólido resultante de pintar `fg` con opacidad `alpha` sobre `bg`. */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const c = f.map((v, i) => Math.round(v * alpha + b[i]! * (1 - alpha)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function useTokens(): Palette & { scheme: Scheme } {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palettes[scheme], scheme };
}
