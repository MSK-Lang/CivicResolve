/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Redesigned Editorial Palette (Notion / Granola / Linear inspired)
        canvas: '#F6F5F0',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#EFECE6',
          muted: '#E8E5DD',
        },
        ink: {
          primary: '#242522',
          secondary: '#706F68',
          muted: '#9C9A91',
        },
        border: {
          DEFAULT: '#E6E4DC',
          subtle: '#E6E4DC',
          strong: '#CCC9BF',
        },
        accent: {
          DEFAULT: '#765448',
          hover: '#5E4238',
          subtle: '#F2ECE9',
        },
        // Priority status tokens
        priority: {
          p1: { bg: '#FBEBEB', text: '#8A2222', border: '#F3C7C7' },
          p2: { bg: '#FDF2E9', text: '#914811', border: '#F8D5B7' },
          p3: { bg: '#FEF9E7', text: '#7A5B0B', border: '#F5E5A8' },
          p4: { bg: '#EDF6F0', text: '#306B48', border: '#C6E6D1' },
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Lato', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(36, 37, 34, 0.04)',
        elevated: '0 4px 12px 0 rgba(36, 37, 34, 0.06)',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
