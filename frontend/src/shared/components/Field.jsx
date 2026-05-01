import { memo } from 'react';

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">
        {required && <span className="text-red-500 mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  );
}

export default memo(Field);
