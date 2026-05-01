import { useAuth } from '../context/AuthContext';
import { HiOutlineExclamation, HiOutlineSparkles } from 'react-icons/hi';

// Per-plan warn windows (kept in sync with backend/utils/plans.js).
// Trial plans warn every day (no window) — that's the user's requirement.
const WARN_DAYS = { 'Monthly': 3, '6-Month': 15, 'Yearly': 30 };

function daysRemaining(end) {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function SubscriptionBanner() {
  const { user } = useAuth();
  if (!user || user.role === 'SuperAdmin') return null;

  const sub = user.subscription;
  if (!sub || !sub.planEndDate) return null;

  const remaining = daysRemaining(sub.planEndDate);
  const isExpired = remaining != null && remaining < 0;
  const isTrial = sub.plan === 'Trial';
  const warnWindow = WARN_DAYS[sub.plan];

  // Decide visibility: expired → red banner; trial → always show; otherwise
  // only show inside the plan's warn window.
  let mode = null;
  if (isExpired) mode = 'expired';
  else if (isTrial) mode = 'trial';
  else if (warnWindow != null && remaining != null && remaining <= warnWindow) mode = 'warn';
  if (!mode) return null;

  const palette = {
    expired: 'bg-red-50 border-red-300 text-red-800',
    trial:   'bg-amber-50 border-amber-300 text-amber-800',
    warn:    'bg-amber-50 border-amber-300 text-amber-800',
  }[mode];

  const Icon = mode === 'trial' ? HiOutlineSparkles : HiOutlineExclamation;

  let message;
  if (mode === 'expired') {
    message = (
      <>
        <b>Your subscription has expired.</b>{' '}
        Please contact your administrator to renew your plan.
      </>
    );
  } else if (mode === 'trial') {
    message = remaining === 0 ? (
      <><b>Trial expires today.</b> Please upgrade your plan to keep using MedStore Pro.</>
    ) : (
      <>
        <b>Trial:</b> {remaining} {remaining === 1 ? 'day' : 'days'} remaining.{' '}
        Please upgrade your plan before it expires.
      </>
    );
  } else {
    message = (
      <>
        <b>{sub.plan} plan</b> expires in <b>{remaining}</b> {remaining === 1 ? 'day' : 'days'}.{' '}
        Renew it to avoid interruption.
      </>
    );
  }

  return (
    <div className={`border-b ${palette} px-4 lg:px-6 py-2.5 flex items-center gap-2 text-sm`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1">{message}</p>
    </div>
  );
}
