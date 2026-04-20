import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName: '', email: '', password: '', confirmPassword: '',
    phone: '', ownerName: '', city: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        storeName: form.storeName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        ownerName: form.ownerName,
        address: { city: form.city },
      });
      toast.success('Store registered successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-heading font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Register Your Pharmacy</h1>
          <p className="text-gray-500 mt-1">Start your 14-day free trial</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Store / Pharmacy Name</label>
              <input className="input-field" placeholder="Al-Shifa Medical Store" value={form.storeName} onChange={update('storeName')} required />
            </div>
            <div>
              <label className="label">Owner Name</label>
              <input className="input-field" placeholder="Dr. Ahmed Khan" value={form.ownerName} onChange={update('ownerName')} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="admin@yourpharmacy.com" value={form.email} onChange={update('email')} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input-field" placeholder="+92300XXXXXXX" value={form.phone} onChange={update('phone')} required />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input-field" placeholder="Lahore" value={form.city} onChange={update('city')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" placeholder="Min 6 characters" value={form.password} onChange={update('password')} required minLength={6} />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Re-enter password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating Store...' : 'Register & Start Free Trial'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
