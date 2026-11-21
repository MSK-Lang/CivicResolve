/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Civic Green scale (institutional authority, AA/AAA contrast)
        civic: {
          50: '#EBF8EE',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#95D5B2',
          400: '#74C69D',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F',
          800: '#1B4332', // Primary brand ink and primary action
          900: '#112A1F',
          950: '#0C241B',
        },
        // Action Terracotta scale (urgent action, beacon contrast)
        terracotta: {
          50: '#FDF6ED',
          100: '#FBE8D6',
          200: '#F6D0AD',
          300: '#EDB27E',
          400: '#E39151',
          500: '#D9732B',
          600: '#C05621', // Interactive borders and hover accents
          700: '#9C4221', // Primary terracotta CTA and text (6.5:1 ratio)
          800: '#7C341A',
          900: '#642B18',
        },
        // Archival Paper surfaces
        paper: {
          bg: '#FBF9F5',      // Warm paper canvas
          card: '#FFFFFF',    // Crisp card surface
          subtle: '#F3EFE6',  // Secondary background and table rows
          muted: '#EAE4D7',   // Hover background for subtle elements
        },
        // Structural borders
        border: {
          subtle: '#E2DCD2', // Standard card and divider border
          strong: '#B8AFA0', // Input and interactive control border
        },
        // Ink / Text tokens
        ink: {
          primary: '#0F172A',   // Slate 900 (16.9:1 ratio on paper)
          secondary: '#475569', // Slate 600 (7.2:1 ratio on paper)
          muted: '#64748B',     // Slate 500 (4.8:1 ratio on paper)
        },
        // Priority status tokens (Design.md calibrated)
        priority: {
          p1: {
            bg: '#FEF2F2',
            text: '#991B1B',
            border: '#FCA5A5',
          },
          p2: {
            bg: '#FFF7ED',
            text: '#9A3412',
            border: '#FDBA74',
          },
          p3: {
            bg: '#FEFCE8',
            text: '#854D0E',
            border: '#FDE047',
          },
          p4: {
            bg: '#F0FDF4',
            text: '#166534',
            border: '#86EFAC',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Charter', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        tactile: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
