/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');
module.exports = {
  //   presets: [require('frappe-ui/src/utils/tailwind.config')],
  corePlugins: {
    preflight: false,
  },
  darkMode: 'selector',
  prefix: 'tw-',
  content: [
    './translation_tools/public/js/translation_tools/**/*.{js,jsx,ts,tsx,html}',
    './translation_tools/public/js/translation_tools/components/**/*.{js,jsx,ts,tsx,html}',
    './translation_tools/public/js/thai_translator/**/*.{js,jsx,ts,tsx,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--tw-font-sans)', ...fontFamily.sans],
        // Add your Thai fonts
        kanit: ['Kanit', 'sans-serif'],
        sarabun: ['Sarabun', 'sans-serif'],
        prompt: ['Prompt', 'sans-serif'],
        pridi: ['Pridi', 'serif'],
        mitr: ['Mitr', 'sans-serif'],
        'noto-thai': ['"Noto Sans Thai"', 'sans-serif'],
        pattaya: ['Pattaya', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
    require('tailwindcss-animate'),
    require('tailwindcss-debug-screens'),
    // require('tailwindcss-children'),
  ],
};
