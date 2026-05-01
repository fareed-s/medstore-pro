// Project-themed wrappers around SweetAlert2. All modal alerts/confirms in
// the app should go through these so the visual style stays consistent.
import Swal from 'sweetalert2';

// Tailwind primary-600 / primary-700 (deep emerald) — matches sidebar / buttons.
const PRIMARY     = '#15803d';
const PRIMARY_RED = '#dc2626';
const GRAY_BTN    = '#e5e7eb';

// ── Modal: simple message box (window.alert replacement) ──────────────────
export function alert(message, { title, icon = 'info' } = {}) {
  return Swal.fire({
    icon,
    title: title || (icon === 'error' ? 'Error' : icon === 'success' ? 'Done' : 'Info'),
    text: typeof message === 'string' ? message : String(message ?? ''),
    confirmButtonColor: PRIMARY,
    confirmButtonText: 'OK',
  });
}

// ── Modal: confirm/cancel (window.confirm replacement) ────────────────────
// Returns boolean. Use { danger: true } for destructive actions (red CTA).
export async function confirm(message, {
  title = 'Are you sure?',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  icon = 'question',
  danger = false,
} = {}) {
  const res = await Swal.fire({
    icon,
    title,
    text: typeof message === 'string' ? message : String(message ?? ''),
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? PRIMARY_RED : PRIMARY,
    cancelButtonColor: GRAY_BTN,
    reverseButtons: true,
    focusCancel: danger,   // safer default for destructive prompts
  });
  return !!res.isConfirmed;
}

// Convenience alias for delete/suspend prompts.
export const confirmDanger = (message, opts = {}) =>
  confirm(message, { icon: 'warning', danger: true, confirmText: 'Confirm', ...opts });

export default Swal;
