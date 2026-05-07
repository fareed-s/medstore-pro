// Header lock icon for the hidden Controlled/Narcotic Drugs module.
//
// Visible only when the SuperAdmin has enabled the module for this store,
// inspection mode is OFF, and the current user is in the allow-list. In every
// other case the icon is omitted entirely — there's no UI hint that the
// feature even exists.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineX } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { useControlledModule } from '../../context/ControlledModuleContext';
import { apiError } from '../../utils/helpers';

export default function ControlledModuleLock() {
  const { showLockIcon, unlocked, unlock } = useControlledModule();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!showLockIcon) return null;

  const handleClick = () => {
    if (unlocked) {
      // Already authenticated this session — go straight in.
      navigate('/secure');
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title={unlocked ? 'Open controlled drugs' : 'Unlock controlled drugs'}
        aria-label="Controlled drugs"
        className={`btn-ghost p-2 relative ${unlocked ? 'text-emerald-600' : 'text-gray-500'}`}
      >
        <HiOutlineLockClosed className="w-5 h-5" />
        {unlocked && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
        )}
      </button>

      {open && (
        <UnlockModal
          onClose={() => setOpen(false)}
          onUnlock={async (pwd) => {
            await unlock(pwd);
            setOpen(false);
            navigate('/secure');
          }}
        />
      )}
    </>
  );
}

function UnlockModal({ onClose, onUnlock }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      await onUnlock(password);
    } catch (err) {
      const left = err.response?.data?.attemptsLeft;
      const msg = apiError(err, 'Failed to unlock');
      setError(typeof left === 'number' ? `${msg} (${left} attempts left)` : msg);
      setPassword('');
      // Don't toast — the inline error is enough and toasts pile up on retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <HiOutlineLockClosed className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-white">Restricted Module</h3>
            <p className="text-xs text-gray-300">Controlled drugs access</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="label">Module Password</label>
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              className="input-field"
              placeholder="Enter the access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />
            {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
            <p className="text-[11px] text-gray-400 mt-2">
              This is separate from your login password. Set by the platform administrator.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={busy || !password}>
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
