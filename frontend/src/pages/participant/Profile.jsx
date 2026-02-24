import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { User, Mail, Phone, Building, Tag, Lock, Users, Pencil, Check, X, GraduationCap } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageLoader } from '../../components/ui/Skeleton';

const INTERESTS = [
  'Music', 'Dance', 'Drama', 'Art', 'Photography', 'Film',
  'Tech', 'Coding', 'Robotics', 'Science', 'Literature', 'Debate',
  'Sports', 'Fitness', 'Gaming', 'Food',
];

const Profile = () => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [following, setFollowing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      setError('');
      const res = await axiosInstance.get('/participant/profile');
      setProfile(res.data);
      setFormData({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        contactNumber: res.data.contactNumber || '',
        collegeOrg: res.data.collegeOrg || '',
        interests: res.data.interests || [],
      });
      setFollowing(res.data.followedOrganizers || []);
    } catch (e) { setError('Failed to load profile.'); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/participant/profile', formData);
      setProfile({ ...profile, ...formData });
      setEditing(false);
      toast.success('Profile updated!');
    } catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const toggleInterest = (interest) => {
    const cur = formData.interests || [];
    setFormData({ ...formData, interests: cur.includes(interest) ? cur.filter(i => i !== interest) : [...cur, interest] });
  };

  const handlePasswordChange = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return setPwMsg('error:Fill both fields');
    try {
      await axiosInstance.post('/auth/change-password', pwForm);
      setPwMsg('success:Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (e) { setPwMsg('error:' + (e.response?.data?.error || 'Error')); }
  };

  const unfollow = async (orgId) => {
    try {
      await axiosInstance.delete(`/organizers/${orgId}/follow`);
      setFollowing(following.filter(o => o._id !== orgId));
    } catch (_) { toast.error('Error unfollowing'); }
  };

  if (!profile && error) return (
    <div className="min-h-screen bg-ink flex flex-col justify-center items-center gap-4">
      <p className="font-mono text-[13px] text-error">{error}</p>
      <button onClick={fetchProfile} className="font-mono text-[11px] uppercase tracking-wider text-accent-primary hover:underline">Retry</button>
    </div>
  );

  if (!profile) return <PageLoader />;

  const pwParts = pwMsg.split(':');
  const pwStatus = pwParts[0];
  const pwText = pwParts.slice(1).join(':');

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Profile Card */}
        <div className="bg-surface border border-border overflow-hidden">
          {/* Header */}
          <div className="mesh-bg p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 bg-accent-primary text-ink flex items-center justify-center font-display text-3xl tracking-wider">
                {profile.firstName?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <h1 className="font-display text-2xl tracking-wider text-text-primary">{(profile.firstName + ' ' + profile.lastName).toUpperCase()}</h1>
                <p className="font-mono text-[11px] text-accent-primary">{profile.email}</p>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">{profile.collegeOrg || 'No college set'}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!editing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {[
                    [Mail, 'Email', profile.email],
                    [GraduationCap, 'Type', profile.participantType || '-'],
                    [Phone, 'Contact', profile.contactNumber || '-'],
                    [Building, 'College/Org', profile.collegeOrg || '-'],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="bg-ink border border-border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={10} className="text-text-muted" />
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{label}</p>
                      </div>
                      <p className="font-heading text-sm text-text-primary">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={10} className="text-text-muted" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">Interests</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.interests || []).length > 0
                      ? profile.interests.map(i => (
                        <span key={i} className="font-mono text-[10px] text-accent-primary px-2 py-1 border border-accent-primary/30 bg-accent-primary/5">{i}</span>
                      ))
                      : <span className="font-mono text-[11px] text-text-muted">None selected</span>}
                  </div>
                </div>

                <button onClick={() => setEditing(true)} className="btn-brutal btn-primary flex items-center gap-2">
                  <Pencil size={12} /> Edit Profile
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[['firstName', 'First Name'], ['lastName', 'Last Name'], ['contactNumber', 'Contact'], ['collegeOrg', 'College / Org']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">{label}</label>
                      <input type="text" value={formData[key] || ''}
                        onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        className="input-brutal w-full" />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        className={`font-mono text-[10px] px-3 py-1.5 border transition-all ${
                          (formData.interests || []).includes(interest)
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-border text-text-muted hover:border-text-secondary'
                        }`}>
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving} className="btn-brutal btn-primary flex items-center gap-1.5">
                    <Check size={12} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-brutal btn-ghost flex items-center gap-1.5">
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Following */}
        <div className="bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-text-muted" />
            <h2 className="font-heading text-sm text-text-primary">Following ({following.length})</h2>
          </div>
          {following.length === 0 ? (
            <p className="font-mono text-[12px] text-text-muted">
              Not following any clubs yet.{' '}
              <Link to="/participant/clubs" className="text-accent-primary hover:underline">Browse clubs &rarr;</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {following.map((org) => (
                <div key={org._id} className="flex items-center justify-between bg-ink border border-border p-3">
                  <Link to={`/participant/organizer/${org._id}`} className="font-heading text-sm text-text-primary hover:text-accent-primary transition-colors">{org.name}</Link>
                  <button onClick={() => unfollow(org._id)}
                    className="font-mono text-[9px] uppercase tracking-wider text-error border border-error/30 px-3 py-1 hover:bg-error/10 transition-colors">
                    Unfollow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={14} className="text-text-muted" />
            <h2 className="font-heading text-sm text-text-primary">Change Password</h2>
          </div>
          <div className="space-y-3">
            <input type="password" placeholder="Current Password" value={pwForm.currentPassword}
              onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="input-brutal w-full" />
            <input type="password" placeholder="New Password (min 8 chars)" value={pwForm.newPassword}
              onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="input-brutal w-full" />
            {pwMsg && (
              <div className={`font-mono text-[12px] px-3 py-2 border-l-[3px] ${
                pwStatus === 'success' ? 'border-success text-success bg-success/5' : 'border-error text-error bg-error/5'
              }`}>
                {pwText}
              </div>
            )}
            <button onClick={handlePasswordChange} className="btn-brutal btn-primary">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
