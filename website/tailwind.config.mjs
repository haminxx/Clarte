/** @type {import('tailwindcss').Config} */
// v2: Lightspark-style light editorial palette (see ../LIGHTSPARK_TEARDOWN.md).
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F8F7',
        ink: '#1A1A1A',
        'ink-hover': '#353535',
        g: {
          100: '#F0F0EE', 200: '#DEDED9', 300: '#C1C0B8', 400: '#989898', 500: '#7C7C7C',
          600: '#656565', 700: '#464646', 800: '#3D3D3D', 900: '#282828', 950: '#1A1A1A',
        },
        hair: 'rgba(38,38,35,0.10)',
        'hair-dark': 'rgba(255,255,255,0.08)',
        mark: '#232323',
        // legacy v1 tokens (unused v1 components still reference them)
        bg: '#07080A', surface: '#0E1013', 'surface-2': '#15181D', line: '#23272E', muted: '#9AA1AC', dim: '#6B7280',
        accent: '#7C9CFF', 'accent-2': '#A78BFA', signal: '#5EEAD4', warn: '#F5A524',
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { page: '1220px' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.175,.885,.32,1.1)',
        out: 'cubic-bezier(.22,1,.36,1)',
        wander: 'cubic-bezier(.455,.03,.515,.955)',
      },
      keyframes: {
        'wander-x': { '0%,100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(var(--wx,10px))' } },
        'wander-y': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(var(--wy,12px))' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'card-in': { from: { opacity: '0', transform: 'scale(.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'wander-x': 'wander-x var(--tx,12s) cubic-bezier(.455,.03,.515,.955) infinite',
        'wander-y': 'wander-y var(--ty,16s) cubic-bezier(.455,.03,.515,.955) infinite',
        'card-in': 'card-in .9s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
