import { useRef, useState } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, apiError } from '../../utils/helpers';
import { toast } from 'react-toastify';
import {
  HiOutlineUser, HiOutlineUpload, HiOutlineKey, HiOutlineMail, HiOutlinePhone,
  HiOutlineCheck,
} from 'react-icons/hi';

export default function ProfilePage() {
  const { user, checkAuth } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await API.put('/auth/profile', { name, phone });
      await checkAuth();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarPick = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    // Optimistic preview
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await API.post('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarPreview(data.avatar);
      await checkAuth();
      toast.success('Avatar updated');
    } catch (err) {
      setAvatarPreview(user?.avatar || null);
      toast.error(apiError(err, 'Avatar upload failed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { toast.error('New passwords do not match'); return; }
    setSavingPwd(true);
    try {
      await API.put('/auth/password', { currentPassword: currentPwd, newPassword: newPwd });
      toast.success('Password changed');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      toast.error(apiError(err, 'Failed to change password'));
    } finally {
      setSavingPwd(false);
    }
  };

  const initial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm">Update your photo, contact details, and password.</p>
      </div>

      {/* Avatar + identity */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-primary-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 font-bold text-3xl flex items-center justify-center border-2 border-primary-100">
                {initial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-lg text-gray-900 truncate">{user?.name}</p>
            <p className="text-sm text-gray-500 truncate flex items-center gap-1.5"><HiOutlineMail className="w-4 h-4" />{user?.email}</p>
            <p className="text-xs text-primary-600 mt-0.5">{ROLE_LABELS[user?.role] || user?.role}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-secondary flex items-center gap-1.5 text-sm">
                <HiOutlineUpload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Change Photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onAvatarPick(e.target.files?.[0])}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, WEBP or GIF · max 2 MB</p>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="card mb-4">
        <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <HiOutlineUser className="w-4 h-4 text-primary-600" /> Personal Details
        </h3>
        <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><HiOutlinePhone className="w-3.5 h-3.5" />Phone</label>
            <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email (read-only)</label>
            <input className="input-field bg-gray-50" value={user?.email || ''} disabled />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-1.5">
              <HiOutlineCheck className="w-4 h-4" />{savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <HiOutlineKey className="w-4 h-4 text-amber-500" /> Change Password
        </h3>
        <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Current Password</label>
            <input type="password" className="input-field" autoComplete="current-password" required
              value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input-field" autoComplete="new-password" minLength={6} required
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input-field" autoComplete="new-password" minLength={6} required
              value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={savingPwd} className="btn-primary">
              {savingPwd ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
