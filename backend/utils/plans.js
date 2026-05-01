// Plan duration + alert-window helpers, shared by SuperAdmin controller,
// auth middleware, and the daily expiry cron.
//
// Plans:
//   Trial    — duration is set per-store via Store.trialDays (custom)
//   Monthly  — 30 days; warn 3 days before expiry
//   6-Month  — 180 days; warn 15 days before expiry
//   Yearly   — 365 days; warn 30 days before expiry

const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_META = {
  'Trial':   { days: null, warnDays: null }, // warning shown every day on Trial
  'Monthly': { days: 30,   warnDays: 3   },
  '6-Month': { days: 180,  warnDays: 15  },
  'Yearly':  { days: 365,  warnDays: 30  },
};

const VALID_PLANS = Object.keys(PLAN_META);

function isValidPlan(plan) {
  return VALID_PLANS.includes(plan);
}

// Calculate planEndDate given a plan, optional trialDays, and start date.
function computeEndDate(plan, { trialDays, start = new Date() } = {}) {
  if (plan === 'Trial') {
    const days = parseInt(trialDays) || 7;
    return new Date(start.getTime() + days * DAY_MS);
  }
  const days = PLAN_META[plan]?.days;
  if (!days) return null;
  return new Date(start.getTime() + days * DAY_MS);
}

// How many days remain until planEndDate (rounded up; 0 means expires today).
function daysRemaining(planEndDate) {
  if (!planEndDate) return null;
  const ms = new Date(planEndDate).getTime() - Date.now();
  return Math.ceil(ms / DAY_MS);
}

// Should we show a warning banner? Returns true when the remaining-days count
// falls inside the plan's warn window. Trial plans always warn.
function shouldWarn(plan, planEndDate) {
  if (!planEndDate) return false;
  const remaining = daysRemaining(planEndDate);
  if (remaining == null || remaining < 0) return false;
  if (plan === 'Trial') return true;
  const w = PLAN_META[plan]?.warnDays;
  return w != null && remaining <= w;
}

function isExpired(planEndDate) {
  if (!planEndDate) return false;
  return new Date(planEndDate).getTime() < Date.now();
}

module.exports = {
  PLAN_META,
  VALID_PLANS,
  isValidPlan,
  computeEndDate,
  daysRemaining,
  shouldWarn,
  isExpired,
};
