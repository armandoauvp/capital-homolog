// Config portada do tailwind.config inline do original (antes via cdn.tailwindcss.com).
// script.js entra no content porque polaroids, filtros, mapa e lightbox montam classes por JS.
export default {
  content: { relative: true, files: ['./index.html', './*.js'] },
  important: true,
  darkMode: 'class',
  // z-index das polaroids é montado por concatenação (`z-[${index + 10}]`) e não é visto pelo scanner
  safelist: Array.from({ length: 15 }, (_, i) => `z-[${i + 10}]`),
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        'greece-green': '#0a1a15',
        'greece-yellow': '#facc15',
      },
      animation: {
        'pop-in': 'popIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'scale(1.4) translateY(100px) rotate(calc(var(--card-rot) - 15deg))' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0) rotate(var(--card-rot))' },
        },
      },
    },
  },
}
