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
      colors: {
        background: 'hsl(var(--tw-background))',
        foreground: 'hsl(var(--tw-foreground))',
        border: 'hsl(var(--tw-border))',
        input: 'hsl(var(--tw-input))',
        ring: 'hsl(var(--tw-ring))',
        card: 'hsl(var(--tw-card))',
        'card-foreground': 'hsl(var(--tw-card-foreground))',
        primary: 'hsl(var(--tw-primary))',
        'primary-foreground': 'hsl(var(--tw-primary-foreground))',
        secondary: 'hsl(var(--tw-secondary))',
        'secondary-foreground': 'hsl(var(--tw-secondary-foreground))',
        muted: 'hsl(var(--tw-muted))',
        'muted-foreground': 'hsl(var(--tw-muted-foreground))',
        accent: 'hsl(var(--tw-accent))',
        'accent-foreground': 'hsl(var(--tw-accent-foreground))',
        destructive: 'hsl(var(--tw-destructive))',
        'destructive-foreground': 'hsl(var(--tw-destructive-foreground))',
        popover: 'hsl(var(--tw-popover))',
        'popover-foreground': 'hsl(var(--tw-popover-foreground))',
      },
      borderRadius: {
        lg: 'var(--tw-radius)',
        md: 'calc(var(--tw-radius) - 2px)',
        sm: 'calc(var(--tw-radius) - 4px)',
      },
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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.foreground'),
            a: { color: theme('colors.primary') },
            h1: { color: theme('colors.foreground') },
            h2: { color: theme('colors.foreground') },
            h3: { color: theme('colors.foreground') },
            strong: { color: theme('colors.foreground') },
            code: { color: theme('colors.primary') },
            blockquote: {
              color: theme('colors.muted-foreground'),
              borderLeftColor: theme('colors.border'),
            },
          },
        },
        dark: {
          css: {
            color: theme('colors.foreground'),
            a: { color: theme('colors.primary') },
            h1: { color: theme('colors.foreground') },
            h2: { color: theme('colors.foreground') },
            h3: { color: theme('colors.foreground') },
            strong: { color: theme('colors.foreground') },
            code: { color: theme('colors.primary') },
            blockquote: {
              color: theme('colors.muted-foreground'),
              borderLeftColor: theme('colors.border'),
            },
          },
        },
      }),
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
