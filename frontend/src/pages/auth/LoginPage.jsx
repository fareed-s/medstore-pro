import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 via-primary-900 to-sidebar-to relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
            <span className="text-white font-heading font-bold text-3xl">M</span>
          </div>
          <h1 className="text-5xl font-heading font-bold text-white mb-4 leading-tight">
            MedStore<br />Pro
          </h1>
          <p className="text-emerald-200/80 text-lg leading-relaxed max-w-md">
            Complete Pharmacy & Medical Store Management System. POS, Inventory, Prescriptions, and more — all in one platform.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {['5000+ Medicines DB', 'Barcode POS', 'Expiry Tracking', 'Multi-Tenant SaaS'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-emerald-200/70 text-sm">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-light">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-heading font-bold text-2xl">M</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900">MedStore Pro</h2>
          </div>

          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your pharmacy dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-field" placeholder="you@pharmacy.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity=".75" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Don't have a store? <Link to="/register" className="text-primary-600 font-semibold hover:underline">Register here</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-700 mb-2">Demo Login Credentials:</p>
            <div className="space-y-1 text-xs text-emerald-600">
              <p>Admin: <span className="font-mono">admin@alshifa.com</span> / admin123456</p>
              <p>Pharmacist: <span className="font-mono">pharmacist@alshifa.com</span> / admin123456</p>
              <p>Cashier: <span className="font-mono">cashier@alshifa.com</span> / admin123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
