import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Single source of truth for light/dark theme. Reads the saved preference from
// localStorage on mount, falls back to the OS-level preference, and applies
// the `dark` class to <html> so Tailwind's `dark:` variants kick in across
// the whole app.
//
// Components consume the context via `useTheme()` — typically just to render
// a toggle button. The actual class flip happens here.

const STORAGE_KEY = 'medstore-theme';   // 'light' | 'dark'

const ThemeContext = createContext({ theme: 'light', toggle: () => {}, setTheme: () => {} });

function readInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* localStorage might be blocked */ }
  // Fall back to OS preference if no saved choice.
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else                  root.classList.remove('dark');
  // Also flip the address-bar / PWA chrome colour so it matches the theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#059669');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readInitialTheme());

  // Apply on mount + whenever it changes
  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t === 'dark' ? 'dark' : 'light'), []);
  const toggle   = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
