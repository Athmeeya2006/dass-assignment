import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Save, ShieldAlert, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Literary', 'Academic', 'Social', 'Other'];

const Profile = () => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', category: '', description: '', contactEmail: '', contactNumber: '', discordWebhook: '' });
  const [resetRequests, setResetRequests] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [profRes, resetRes] = await Promise.all([
          axiosInstance.get('/organizer/profile'),
          axiosInstance.get('/password-reset/my-reset-requests'),
        ]);
        const p = profRes.data.profile || profRes.data;
        setProfile(p);
        setForm({ name: p.name || '', category: p.category || '', description: p.description || '', contactEmail: p.contactEmail || '', contactNumber: p.contactNumber || '', discordWebhook: p.discordWebhook || '' });
        setResetRequests(resetRes.data.requests || resetRes.data || []);
      } catch (err) { console.error('Profile fetch error:', err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const saveProfile = async () => {
    try {
      await axiosInstance.put('/organizer/profile', form);
      toast.success('Profile updated');
    } catch (e) { toast.error(e.response?.data?.error || 'Error saving'); }
  };

  const requestReset = async () => {
    try {
      await axiosInstance.post('/password-reset/request-reset');
      toast.success('Password reset requested');
      const res = await axiosInstance.get('/password-reset/my-reset-requests');
      setResetRequests(res.data.requests || res.data || []);
    } catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const statusIcon = { Pending: <Clock size={12} className="text-accent-primary" />, Approved: <CheckCircle size={12} className="text-success" />, Rejected: <XCircle size={12} className="text-error" /> };
  const statusColor = { Pending: 'text-accent-primary', Approved: 'text-success', Rejected: 'text-error' };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mesh-bg p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">CLUB PROFILE</h1>
            <p className="font-mono text-[11px] text-text-muted mt-1">{profile?.name}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-surface border border-border p-6 mb-6">
          <h2 className="font-heading text-base text-text-primary mb-4">Edit Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Login Email (non-editable)</label>
              <input type="email" value={profile?.loginEmail || ''} readOnly className="input-brutal w-full opacity-60 cursor-not-allowed" />
            </div>
            <div className="col-span-2">
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Club Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-brutal w-full" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Contact Email</label>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="input-brutal w-full" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Contact Number</label>
              <input type="text" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-brutal w-full" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Discord Webhook</label>
              <input type="text" value={form.discordWebhook} onChange={(e) => setForm({ ...form, discordWebhook: e.target.value })} className="input-brutal w-full" placeholder="https://discord.com/api/webhooks/..." />
            </div>
            <div className="col-span-2">
              <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Description</label>
              <textarea value={form.description} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary resize-none" />
            </div>
          </div>
          <button onClick={saveProfile} className="btn-brutal btn-primary mt-4 flex items-center gap-1"><Save size={12} /> Save Profile</button>
        </div>

        {/* Password Reset */}
        <div className="bg-surface border border-border p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-accent-secondary" />
              <h2 className="font-heading text-base text-text-primary">Password Reset</h2>
            </div>
            <button onClick={requestReset} className="btn-brutal btn-ghost flex items-center gap-1 !text-[10px]"><ShieldAlert size={10} /> Request Reset</button>
          </div>
          <p className="font-mono text-[11px] text-text-muted mb-4">Password resets require admin approval. Once approved, you'll receive a new password.</p>
          {resetRequests.length === 0 ? (
            <p className="text-center font-mono text-[12px] text-text-muted py-4">No reset requests</p>
          ) : (
            <div className="space-y-2">
              {resetRequests.map(r => (
                <div key={r._id} className="flex items-center justify-between bg-ink border border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    {statusIcon[r.status]}
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${statusColor[r.status]}`}>{r.status}</span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
