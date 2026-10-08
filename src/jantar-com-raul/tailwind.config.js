// Config portada do tailwind.config inline do original (antes via cdn.tailwindcss.com).
export default {
  content: { relative: true, files: ['./index.html'] },
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Elms Sans"', 'sans-serif'],
        sans: ['"Lato"', 'sans-serif'],
      },
      colors: {
        wine: {
          500: '#9b2226',
          800: '#601417',
          900: '#3e0b0e',
        },
      },
    },
  },
}
