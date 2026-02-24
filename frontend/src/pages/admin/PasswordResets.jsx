import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Clock, CheckCircle, XCircle, Copy, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const PasswordResets = () => {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [expanded, setExpanded] = useState(null);
  const [genPasswords, setGenPasswords] = useState({});

  const fetchRequests = async () => {
    try { const res = await axiosInstance.get('/admin/password-reset-requests'); setRequests(res.data.requests || res.data || []); }
    catch (err) { console.error('Password reset requests fetch error:', err); } finally { setLoading(false); }
  };
  useEffect(() => { fetchRequests(); }, []);

  const approve = async (id) => {
    try {
      const res = await axiosInstance.post(`/admin/approve-password-reset/${id}`);
      if (res.data.newPassword) setGenPasswords(p => ({ ...p, [id]: res.data.newPassword }));
      toast.success('Approved'); fetchRequests();
    } catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const reject = async (id) => {
    try { await axiosInstance.post(`/admin/reject-password-reset/${id}`); toast.success('Rejected'); fetchRequests(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);
  const statusIcon = { Pending: <Clock size={12} className="text-accent-primary" />, Approved: <CheckCircle size={12} className="text-success" />, Rejected: <XCircle size={12} className="text-error" /> };
  const statusColor = { Pending: 'border-accent-primary text-accent-primary', Approved: 'border-success text-success', Rejected: 'border-error text-error' };
  const counts = { All: requests.length, Pending: requests.filter(r => r.status === 'Pending').length, Approved: requests.filter(r => r.status === 'Approved').length, Rejected: requests.filter(r => r.status === 'Rejected').length };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mesh-bg p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">PASSWORD RESETS</h1>
            <p className="font-mono text-[11px] text-text-muted mt-1">{counts.Pending} pending requests</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0 mb-6 border-b border-border">
          {['Pending', 'Approved', 'Rejected', 'All'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] px-4 py-3 border-b-2 transition-all ${
                filter === f ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}>{f} ({counts[f]})</button>
          ))}
        </div>

        {/* Requests */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Lock size={32} className="text-text-muted mx-auto mb-2" />
            <p className="font-mono text-[12px] text-text-muted">No {filter.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {filtered.map(req => (
              <div key={req._id} className="bg-surface border border-border">
                <button onClick={() => setExpanded(expanded === req._id ? null : req._id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    {statusIcon[req.status]}
                    <div>
                      <p className="font-heading text-sm text-text-primary">{req.organizerId?.name || 'Unknown'}</p>
                      <p className="font-mono text-[10px] text-text-muted">{req.organizerId?.loginEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border-l-[3px] ${statusColor[req.status]}`}>{req.status}</span>
                    <span className="font-mono text-[10px] text-text-muted">{new Date(req.createdAt).toLocaleDateString()}</span>
                    {expanded === req._id ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                  </div>
                </button>

                {expanded === req._id && (
                  <div className="px-4 pb-4 border-t border-border pt-3 animate-slide-in">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-ink border border-border p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">Requested</p>
                        <p className="font-mono text-[12px] text-text-primary mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="bg-ink border border-border p-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">Status</p>
                        <p className={`font-mono text-[12px] mt-1 ${statusColor[req.status]?.split(' ')[1]}`}>{req.status}</p>
                      </div>
                    </div>
                    {genPasswords[req._id] && (
                      <div className="bg-ink border border-success/30 p-3 mb-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-success mb-1">Generated Password</p>
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-[14px] text-text-primary">{genPasswords[req._id]}</code>
                          <button onClick={() => { navigator.clipboard.writeText(genPasswords[req._id]); toast.success('Copied!'); }}
                            className="text-text-muted hover:text-accent-primary"><Copy size={12} /></button>
                        </div>
                      </div>
                    )}
                    {req.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approve(req._id)} className="btn-brutal btn-primary bg-success !text-ink !text-[10px] !py-1 !px-4">Approve & Generate Password</button>
                        <button onClick={() => reject(req._id)} className="btn-brutal btn-danger !text-[10px] !py-1 !px-4">Reject</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResets;
