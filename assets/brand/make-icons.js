// Genera los iconos de la app a partir del logo (la H de siete colores).
// Uso: instalar @resvg/resvg-js en una carpeta aparte y ejecutar
//   node make-icons.js <carpeta-de-salida>
// y copiar los PNG resultantes a assets/.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = process.argv[2];
const COLORS = ['#8b8cf5', '#f2a03d', '#ee6a7e', '#3cc7b0', '#7fc95a', '#d98af0', '#5aa9f2'];
// Celdas de la H en una cuadrícula 3×3 (col, fila) y el color de cada una.
const H = [
  [0, 0, COLORS[0]], [0, 1, COLORS[1]], [0, 2, COLORS[2]],
  [1, 1, COLORS[3]],
  [2, 0, COLORS[4]], [2, 1, COLORS[5]], [2, 2, COLORS[6]],
];
const FAINT = [[1, 0], [1, 2]];

/** Cuadrícula de lado `grid` centrada en un lienzo `size`. */
function svg({ size, grid, bg, faint, mono, bgRadius = 0 }) {
  const gap = grid * 0.075;
  const cell = (grid - 2 * gap) / 3;
  const r = cell * 0.24;
  const o = (size - grid) / 2;
  const rect = (c, f, fill) =>
    `<rect x="${o + c * (cell + gap)}" y="${o + f * (cell + gap)}" width="${cell}" height="${cell}" rx="${r}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${bg ? `<rect width="${size}" height="${size}" rx="${bgRadius}" fill="${bg}"/>` : ''}
${faint ? FAINT.map(([c, f]) => rect(c, f, faint)).join('\n') : ''}
${H.map(([c, f, color]) => rect(c, f, mono ?? color)).join('\n')}
</svg>`;
}

function png(name, opts, out = opts.size) {
  const s = svg(opts);
  fs.writeFileSync(path.join(OUT, name.replace('.png', '.svg')), s);
  const img = new Resvg(s, { fitTo: { mode: 'width', value: out } }).render().asPng();
  fs.writeFileSync(path.join(OUT, name), img);
}

const DARK = '#0b0f10';
const FAINT_ON_DARK = 'rgba(255,255,255,0.06)';

png('icon.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK });
// Adaptativo Android: la máscara recorta hasta el 66 % central.
png('android-icon-foreground.png', { size: 1024, grid: 440, faint: FAINT_ON_DARK });
png('android-icon-background.png', { size: 1024, grid: 0, bg: DARK });
png('android-icon-monochrome.png', { size: 1024, grid: 440, mono: '#ffffff' });
png('notification-icon.png', { size: 96, grid: 76, mono: '#ffffff' });
// Splash: solo la H (sirve sobre fondo claro y oscuro).
png('splash-icon.png', { size: 1024, grid: 1024 });
png('favicon.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK, bgRadius: 220 }, 48);
png('preview.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK, bgRadius: 220 }, 512);
// Web / PWA
png('pwa-192.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK }, 192);
png('pwa-512.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK }, 512);
png('pwa-maskable-512.png', { size: 1024, grid: 480, bg: DARK, faint: FAINT_ON_DARK }, 512);
png('apple-touch-icon.png', { size: 1024, grid: 600, bg: DARK, faint: FAINT_ON_DARK }, 180);
console.log('ok');
