import { memo } from 'react';

// Tailwind purges class names that aren't statically present, so we map to
// fixed class strings instead of interpolating sizes.
const SIZE = { sm: 'w-6 h-6 border-3', md: 'w-8 h-8 border-4', lg: 'w-12 h-12 border-4' };
const PY   = { sm: 'py-6',  md: 'py-12', lg: 'py-16' };

function Spinner({ size = 'md', padding = 'md' }) {
  return (
    <div className={`flex justify-center ${PY[padding] || PY.md}`}>
      <div className={`${SIZE[size] || SIZE.md} border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
    </div>
  );
}

export default memo(Spinner);
