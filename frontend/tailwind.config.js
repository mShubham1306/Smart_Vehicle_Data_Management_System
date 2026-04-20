/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0B',
        card:       '#141414',
        cardAlt:    '#1A1A1A',
        primary:    '#EF4444',
        primaryHov: '#DC2626',
        soft:       '#F87171',
        textLight:  '#F5F5F5',
        textGray:   '#A1A1AA',
        border:     '#262626',
      },
    },
  },
  plugins: [],
}
