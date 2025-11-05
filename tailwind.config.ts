import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Wire design tokens into Tailwind
      colors: {
        // Grays - using direct values so Tailwind can generate utilities
        gray: {
          50: '#F9F9F9',
          100: '#E9E9E9',
          200: '#CDCDCD',
          300: '#A5A5A5',
          400: '#767676',
          500: '#5F5F5F',
          600: '#4A4A4A',
          700: '#383838',
          800: '#2B2B2B',
          900: '#1E1E1E',
          950: '#181818',
        },
        // System colors
        blue: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        green: {
          50: '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        red: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        yellow: {
          50: '#FEFCE8',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
        },
        // Semantic colors
        success: '#22C55E',
        error: '#EF4444',
        warning: '#EAB308',
        info: '#3B82F6',
        // Surface & text
        background: '#1E1E1E',
        surface: '#2B2B2B',
        border: '#383838',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
        mono: ['var(--font-family-mono)'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
        '5xl': 'var(--font-size-5xl)',
      },
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      spacing: {
        // Map token spacing
        '0': 'var(--space-0)',
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        in: 'var(--ease-in)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      zIndex: {
        base: 'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        notification: 'var(--z-notification)',
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-normal) var(--ease-out)',
        'fade-in-scale': 'fadeInScale var(--duration-normal) var(--ease-out)',
        'slide-in-right': 'slideInFromRight var(--duration-normal) var(--ease-out)',
        'slide-in-bottom': 'slideInFromBottom var(--duration-normal) var(--ease-out)',
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config

