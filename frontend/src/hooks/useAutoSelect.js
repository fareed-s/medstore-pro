import { useEffect } from 'react';

/**
 * Automatically selects all text in number/text inputs when focused.
 * Attach to document once — works globally.
 */
export function useAutoSelectInputs() {
  useEffect(() => {
    const handler = (e) => {
      const el = e.target;
      if (el.tagName === 'INPUT' && (el.type === 'number' || el.type === 'text')) {
        // Only auto-select if value looks like a default zero or a number
        if (el.type === 'number' || (!isNaN(el.value) && el.value !== '')) {
          setTimeout(() => {
            try { el.select(); } catch {}
          }, 0);
        }
      }
    };

    document.addEventListener('focus', handler, true);
    return () => document.removeEventListener('focus', handler, true);
  }, []);
}

export default useAutoSelectInputs;
