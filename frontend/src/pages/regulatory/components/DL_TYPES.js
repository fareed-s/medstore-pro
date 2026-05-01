export const DL_TYPES = [
  { value: 'store_retail',     label: 'Retail Drug License' },
  { value: 'store_wholesale',  label: 'Wholesale Drug License' },
  { value: 'store_restricted', label: 'Restricted Drug License' },
  { value: 'narcotic',         label: 'Narcotic Drug License' },
  { value: 'supplier',         label: 'Supplier DL' },
];

export const DL_TYPE_LABEL = Object.fromEntries(DL_TYPES.map((t) => [t.value, t.label]));
