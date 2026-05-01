// Robust copy-to-clipboard. Browsers block `navigator.clipboard.writeText`
// on insecure origins (anything that isn't HTTPS or localhost), so when the
// app is served over plain HTTP from a VPS IP we have to fall back to the
// older `document.execCommand('copy')` trick with a hidden textarea.
//
// Returns a Promise<boolean> — true on success, false if both paths failed.
export async function copyToClipboard(text) {
  const value = String(text ?? '');

  // Modern path — works on HTTPS, localhost, file://, and inside extensions.
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  // Legacy path — works on plain HTTP. The textarea must be in the DOM and
  // selected before execCommand fires.
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    // Off-screen but still selectable. `position:fixed` avoids scroll jumps.
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
