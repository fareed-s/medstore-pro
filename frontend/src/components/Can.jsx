import { useAuth } from '../context/AuthContext';

// Conditional renderer driven by the per-module permission matrix.
// Usage:
//   <Can module="medicines" action="add"><AddButton/></Can>
//   <Can role={['SuperAdmin','StoreAdmin']} fallback={null}>...</Can>
export default function Can({ module, action = 'view', role, fallback = null, children }) {
  const { user, can, hasRole } = useAuth();
  if (!user) return fallback;
  if (role && !hasRole(...(Array.isArray(role) ? role : [role]))) return fallback;
  if (module && !can(module, action)) return fallback;
  return children;
}
