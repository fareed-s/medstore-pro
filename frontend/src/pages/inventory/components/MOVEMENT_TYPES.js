// Shared movement-type metadata used by row + summary components.
export const TYPE_LABELS = {
  purchase:       { label: 'Purchase',       color: 'badge-green', icon: '📦' },
  sale:           { label: 'Sale',           color: 'badge-blue',  icon: '🛒' },
  return_in:      { label: 'Return (In)',    color: 'badge-amber', icon: '↩️' },
  return_out:     { label: 'Return (Out)',   color: 'badge-amber', icon: '↪️' },
  adjustment_in:  { label: 'Adjust (+)',     color: 'badge-green', icon: '➕' },
  adjustment_out: { label: 'Adjust (-)',     color: 'badge-red',   icon: '➖' },
  transfer_in:    { label: 'Transfer In',    color: 'badge-blue',  icon: '📥' },
  transfer_out:   { label: 'Transfer Out',   color: 'badge-blue',  icon: '📤' },
  expired:        { label: 'Expired',        color: 'badge-red',   icon: '⏰' },
  damaged:        { label: 'Damaged',        color: 'badge-red',   icon: '💔' },
  opening:        { label: 'Opening Stock',  color: 'badge-gray',  icon: '📋' },
};
