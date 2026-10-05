/** @type {import('tailwindcss').Config} */
// Los valores de color viven en global.css como variables (claro/oscuro).
// Mantener sincronizado con src/theme/tokens.ts.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  // 'class' evita el error de css-interop en web; los colores siguen al sistema vía @media en global.css.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['BricolageGrotesque_400Regular'],
        medium: ['BricolageGrotesque_500Medium'],
        bold: ['BricolageGrotesque_700Bold'],
      },
    },
  },
  plugins: [],
};
