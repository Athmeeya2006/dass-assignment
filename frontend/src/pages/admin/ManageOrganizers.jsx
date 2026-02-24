import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Plus, Search, Eye, EyeOff, Copy, Power, Trash2, X } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const ManageOrganizers = () => {
  const toast = useToast();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contactEmail: '', category: '', description: '' });
  const [credentials, setCredentials] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const fetchOrganizers = async () => {
    try { const res = await axiosInstance.get('/admin/organizers'); setOrganizers(res.data.organizers || res.data || []); }
    catch (err) { console.error('Organizers fetch error:', err); } finally { setLoading(false); }
  };
  useEffect(() => { fetchOrganizers(); }, []);

  const createOrganizer = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.post('/admin/create-organizer', form);
      setCredentials({ email: res.data.credentials.loginEmail, password: res.data.credentials.plainPassword });
      setForm({ name: '', contactEmail: '', category: '', description: '' }); setShowForm(false);
      toast.success('Organizer created'); fetchOrganizers();
    } catch (err) { toast.error(err.response?.data?.error || 'Error creating'); }
  };

  const toggleActive = async (id) => {
    try { await axiosInstance.patch(`/admin/toggle-organizer/${id}`); toast.success('Status toggled'); fetchOrganizers(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const deleteOrganizer = async (id) => {
    if (!window.confirm('Delete this organizer? This cannot be undone.')) return;
    try { await axiosInstance.delete(`/admin/delete-organizer/${id}`); toast.success('Deleted'); fetchOrganizers(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const filtered = organizers.filter(o =>
    !search || (o.name + o.loginEmail + o.contactEmail).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mesh-bg p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">MANAGE CLUBS</h1>
              <p className="font-mono text-[11px] text-text-muted mt-1">{organizers.length} registered organizers</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-brutal btn-primary flex items-center gap-1"><Plus size={12} /> New Organizer</button>
          </div>
        </div>

        {/* Credentials Modal */}
        {credentials && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-accent-primary/30 p-6 max-w-md w-full relative">
              <button onClick={() => setCredentials(null)} className="absolute top-3 right-3 text-text-muted hover:text-text-primary"><X size={16} /></button>
              <h3 className="font-heading text-lg text-text-primary mb-4">Organizer Created</h3>
              <div className="space-y-3">
                <div className="bg-ink border border-border p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Email</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[13px] text-text-primary">{credentials.email}</p>
                    <button onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success('Copied!'); }} className="text-text-muted hover:text-accent-primary"><Copy size={12} /></button>
                  </div>
                </div>
                <div className="bg-ink border border-border p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Password</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[13px] text-text-primary">{showPwd ? credentials.password : '••••••••'}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPwd(!showPwd)} className="text-text-muted hover:text-accent-primary">{showPwd ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                      <button onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success('Copied!'); }} className="text-text-muted hover:text-accent-primary"><Copy size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10px] text-accent-primary mt-3">[!] Save these credentials. The password cannot be retrieved later.</p>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-surface border border-border p-6 mb-6 animate-slide-in">
            <h3 className="font-heading text-base text-text-primary mb-4">Create New Organizer</h3>
            <form onSubmit={createOrganizer} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Club Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-brutal w-full" />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Contact Email *</label>
                <input type="email" required value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className="input-brutal w-full" />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                  <option value="">Select…</option>
                  {['Technical', 'Cultural', 'Sports', 'Literary', 'Academic', 'Social', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-brutal w-full" />
              </div>
              <div className="col-span-2">
                <p className="font-mono text-[10px] text-text-muted">Login email & password will be auto-generated by the system.</p>
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" className="btn-brutal btn-primary">Create</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-brutal btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <Search size={14} className="text-text-muted" />
          <input type="text" placeholder="Search organizers…" value={search} onChange={e => setSearch(e.target.value)} className="input-brutal w-64" />
        </div>

        {/* Table */}
        <div className="bg-surface border border-border overflow-x-auto">
          <table className="w-full font-mono text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Email', 'Category', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(org => (
                <tr key={org._id} className="border-b border-border hover:bg-ink/30">
                  <td className="px-4 py-3 text-text-primary">{org.name}</td>
                  <td className="px-4 py-3 text-text-muted">{org.loginEmail}</td>
                  <td className="px-4 py-3 text-text-secondary">{org.category || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border-l-[3px] ${org.isActive !== false ? 'border-success text-success' : 'border-error text-error'}`}>
                      {org.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(org._id)} className="text-text-muted hover:text-accent-primary" title="Toggle Active">
                        <Power size={14} />
                      </button>
                      <button onClick={() => deleteOrganizer(org._id)} className="text-text-muted hover:text-error" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-text-muted">No organizers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;
