// Drop-in replacement for `react-toastify`. Vite's alias config redirects
// every `import ... from 'react-toastify'` here, so the 30+ files in the app
// keep working unchanged but their toasts are now rendered by SweetAlert2.
//
// Only the surface area the codebase actually uses is supported:
//   import { toast } from 'react-toastify'
//   toast.success | error | warning | warn | info
//   <ToastContainer ... />  (no-op: SweetAlert2 manages its own DOM)

import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

const fire = (icon, message) =>
  Toast.fire({ icon, title: typeof message === 'string' ? message : String(message ?? '') });

export const toast = {
  success: (msg) => fire('success', msg),
  error:   (msg) => fire('error',   msg),
  warning: (msg) => fire('warning', msg),
  warn:    (msg) => fire('warning', msg),
  info:    (msg) => fire('info',    msg),
  // Calling toast() directly (no level) → info
  __call:  (msg) => fire('info',    msg),
  dismiss: () => Swal.close(),
};

// SweetAlert2 manages its own portal — no container needed in the React tree.
export function ToastContainer() { return null; }

export default toast;
