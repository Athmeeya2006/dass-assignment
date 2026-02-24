import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axiosInstance, { BASE_URL } from '../../api/axios';
import io from 'socket.io-client';
import { useToast } from '../../context/ToastContext';
import { Plus, ChevronUp, ChevronDown, Download, Camera, Square, Star, Send, Pin, Trash2, Reply, MessageSquare } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const FIELD_TYPES = ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number'];
const STATUS_FLOW = ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'];
const genId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const EventDetail = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [tab, setTab] = useState(location.state?.openTab || 'overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [customForm, setCustomForm] = useState([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [partStatusFilter, setPartStatusFilter] = useState('All');
  const qrRef = useRef(null);
  const html5QrRef = useRef(null);

  // Forum state
  const [forumMessages, setForumMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const forumSocketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [eventRes, attendRes] = await Promise.all([
        axiosInstance.get(`/organizer/event/${eventId}`),
        axiosInstance.get(`/event/${eventId}/attendance-data`),
      ]);
      setData(eventRes.data);
      setAttendanceData(attendRes.data.tickets || []);
      setEditForm({
        name: eventRes.data.event.name, description: eventRes.data.event.description,
        venue: eventRes.data.event.venue || '', startDate: eventRes.data.event.startDate?.slice(0, 16) || '',
        endDate: eventRes.data.event.endDate?.slice(0, 16) || '', registrationDeadline: eventRes.data.event.registrationDeadline?.slice(0, 16) || '',
        fee: eventRes.data.event.fee || 0, registrationLimit: eventRes.data.event.registrationLimit || '',
        tags: (eventRes.data.event.tags || []).join(', '),
      });
      setCustomForm((eventRes.data.event.customForm || []).map((f) => ({ ...f })));
      if (eventRes.data.event.type === 'Merchandise') {
        const approvalRes = await axiosInstance.get('/organizer/pending-merchandise-approvals');
        const allApprovals = Array.isArray(approvalRes.data) ? approvalRes.data : (approvalRes.data.approvals || []);
        setPendingApprovals(allApprovals.filter((a) => {
          const aEventId = typeof a.eventId === 'object' ? a.eventId?._id : a.eventId;
          return String(aEventId) === eventId;
        }));
      }
      if (['Completed', 'Closed'].includes(eventRes.data.event.status)) {
        try { const fbRes = await axiosInstance.get(`/feedback/${eventId}/summary`); setFeedbackSummary(fbRes.data); } catch (err) { console.error('Feedback summary fetch error:', err); }
      }
    } catch (e) { setError('Failed to load event details.'); } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Forum: fetch messages and setup socket when forum tab is active
  useEffect(() => {
    if (tab === 'forum') {
      fetchForumMessages();
      setupForumSocket();
    }
    return () => {
      if (tab === 'forum' && forumSocketRef.current) {
        forumSocketRef.current.disconnect();
        forumSocketRef.current = null;
      }
    };
  }, [tab, eventId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [forumMessages]);

  const setupForumSocket = () => {
    if (forumSocketRef.current) forumSocketRef.current.disconnect();
    const token = localStorage.getItem('token');
    const socket = io(BASE_URL, { auth: { token } });
    forumSocketRef.current = socket;
    socket.emit('join-event', eventId);
    socket.on('message-received', (data) => setForumMessages((prev) => [...prev, data]));
    socket.on('message-deleted-event', (data) => setForumMessages((prev) => prev.filter((m) => m._id !== data.messageId)));
    socket.on('message-pinned-event', (data) => setForumMessages((prev) => prev.map((m) => (m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m))));
  };

  const fetchForumMessages = async () => {
    try { const res = await axiosInstance.get(`/event/${eventId}/messages`); setForumMessages(res.data); } catch (err) { console.error('Forum messages fetch error:', err); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await axiosInstance.post(`/event/${eventId}/messages`, { content: newMessage, replyTo: replyTo?._id || null });
      forumSocketRef.current?.emit('new-message', { eventId, ...res.data });
      setNewMessage(''); setReplyTo(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send message'); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`/event/message/${messageId}`);
      forumSocketRef.current?.emit('message-deleted', { eventId, messageId });
      setForumMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await axiosInstance.post(`/event/message/${messageId}/pin`);
      fetchForumMessages();
    } catch (err) { toast.error('Failed to pin/unpin'); }
  };

  const startScanner = async () => {
    setScannerActive(true); setScanMsg('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Wait for React to re-render and make the DOM element visible
      await new Promise(resolve => setTimeout(resolve, 100));
      html5QrRef.current = new Html5Qrcode('qr-reader-org');
      await html5QrRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 },
        async (text) => {
          try { await axiosInstance.post('/event/mark-attendance', { ticketId: text }); setScanMsg('Attendance marked!'); await stopScanner(); fetchAll(); }
          catch (err) { setScanMsg('Error: ' + (err.response?.data?.error || 'Error')); }
        });
    } catch (e) { setScanMsg('Error: Camera access failed'); setScannerActive(false); }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) { try { await html5QrRef.current.stop(); html5QrRef.current.clear(); } catch (_) {} }
    setScannerActive(false);
  };

  const addField = () => setCustomForm([...customForm, { fieldId: genId(), label: '', type: 'text', required: false, options: [], order: customForm.length }]);
  const updateField = (idx, key, val) => { const u = [...customForm]; u[idx] = { ...u[idx], [key]: val }; setCustomForm(u); };
  const removeField = (idx) => setCustomForm(customForm.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const u = [...customForm]; const t = dir === 'up' ? idx - 1 : idx + 1;
    if (t < 0 || t >= u.length) return; [u[idx], u[t]] = [u[t], u[idx]];
    setCustomForm(u.map((f, i) => ({ ...f, order: i })));
  };

  const saveEdits = async () => {
    try {
      const payload = { ...editForm, tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean), ...(data.event.type === 'Normal' && { customForm }) };
      await axiosInstance.put(`/organizer/event/${eventId}`, payload);
      toast.success('Event saved!'); fetchAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Error saving'); }
  };

  const changeStatus = async (newStatus) => {
    try {
      if (data?.event?.status === 'Draft' && newStatus === 'Published') {
        await axiosInstance.post(`/organizer/publish-event/${eventId}`);
      } else {
        await axiosInstance.put(`/organizer/event/${eventId}`, { status: newStatus });
      }
      toast.success(`Status -> ${newStatus}`); fetchAll();
    }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  const exportCSV = async () => {
    try {
      const res = await axiosInstance.get(`/organizer/export-participants/${eventId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = `participants_${eventId}.csv`; a.click();
    } catch (e) { toast.error('Failed to export participants CSV'); }
  };

  const exportAttendance = async () => {
    try {
      const res = await axiosInstance.get(`/event/${eventId}/export-attendance`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = `attendance_${eventId}.csv`; a.click();
    } catch (e) { toast.error('Failed to export attendance CSV'); }
  };

  const approvePayment = async (regId) => {
    try { await axiosInstance.post(`/organizer/approve-merchandise/${regId}`); toast.success('Approved'); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };
  const rejectPayment = async (regId) => {
    try { await axiosInstance.post(`/organizer/reject-merchandise/${regId}`); toast.success('Rejected'); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error'); }
  };

  if (loading) return <PageLoader />;
  if (!data) return <div className="min-h-screen bg-ink flex items-center justify-center font-mono text-text-muted">Event not found</div>;

  const { event, analytics, registrationList = [] } = data;
  const filteredParticipants = registrationList.filter((r) => {
    const matchSearch = !partSearch || (r.participantId?.firstName + ' ' + r.participantId?.lastName + r.participantId?.email).toLowerCase().includes(partSearch.toLowerCase());
    const matchStatus = partStatusFilter === 'All' || r.status === partStatusFilter;
    return matchSearch && matchStatus;
  });

  const statusCfg = { Draft: 'border-text-muted text-text-muted', Published: 'border-accent-tertiary text-accent-tertiary', Ongoing: 'border-success text-success', Completed: 'border-accent-secondary text-accent-secondary', Closed: 'border-error text-error' };
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(event.status) + 1];
  const tabs = ['overview', 'analytics', 'participants', 'edit', 'attendance', 'forum', ...(event.type === 'Merchandise' ? ['payments'] : []), ...(['Completed', 'Closed'].includes(event.status) ? ['feedback'] : [])];

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-surface border border-border overflow-hidden">
          {/* Header */}
          <div className="mesh-bg p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
            <div className="relative z-10 flex justify-between items-start flex-wrap gap-3">
              <div>
                <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">{event.name.toUpperCase()}</h1>
                <p className="font-mono text-[11px] text-text-muted mt-1">{event.type} Event</p>
              </div>
              <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-3 py-1 border ${statusCfg[event.status] || ''}`}>{event.status}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-b border-border px-4 overflow-x-auto scrollbar-hide">
            <nav className="flex gap-0">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`font-mono text-[10px] uppercase tracking-[0.1em] px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    tab === t ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}>{t}</button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-4 animate-slide-in">
                <p className="font-mono text-[13px] text-text-secondary leading-relaxed">{event.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['Start', new Date(event.startDate).toLocaleString()], ['End', new Date(event.endDate).toLocaleString()],
                    ['Deadline', new Date(event.registrationDeadline).toLocaleString()], ['Venue', event.venue || '-'],
                    ['Fee', event.fee > 0 ? `₹${event.fee}` : 'Free'], ['Eligibility', event.eligibility || 'Open to All'],
                    ['Reg. Limit', event.registrationLimit || 'Unlimited'], ['Tags', (event.tags || []).join(', ') || '-'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-ink border border-border p-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{k}</p>
                      <p className="font-heading text-sm text-text-primary mt-1">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {nextStatus && <button onClick={() => changeStatus(nextStatus)} className="btn-brutal btn-primary">Move to {nextStatus}</button>}
                  {event.status !== 'Closed' && <button onClick={() => changeStatus('Closed')} className="btn-brutal btn-danger">Close Event</button>}
                </div>
              </div>
            )}

            {/* Analytics */}
            {tab === 'analytics' && (
              <div className="space-y-6 animate-slide-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['Registrations', analytics?.registrationCount || 0, 'text-accent-tertiary'],
                    ['Attendance', analytics?.attendanceCount || 0, 'text-success'],
                    ['Revenue', `₹${analytics?.revenue || 0}`, 'text-accent-secondary'],
                    ['Views (24h)', event.viewTimestamps?.filter((d) => new Date() - new Date(d) < 86400000).length || 0, 'text-accent-primary'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="bg-ink border border-border p-5 text-center">
                      <p className={`font-display text-3xl tracking-wider ${color}`}>{value}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {event.teamRegistration && analytics?.teamCompletion && (
                  <div className="bg-ink border border-border p-4">
                    <h4 className="font-heading text-sm text-text-primary mb-3">Team Completion</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        ['Total Teams', analytics.teamCompletion.total, 'text-accent-primary'],
                        ['Complete', analytics.teamCompletion.complete, 'text-success'],
                        ['Forming', analytics.teamCompletion.forming, 'text-accent-tertiary'],
                      ].map(([label, val, color]) => (
                        <div key={label} className="text-center">
                          <p className={`font-display text-2xl tracking-wider ${color}`}>{val}</p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-ink border border-border p-4">
                  <p className="font-mono text-[12px] text-text-secondary">Total Views: <span className="text-text-primary font-bold">{event.viewCount || 0}</span></p>
                  <p className="font-mono text-[12px] text-text-secondary mt-1">Form Locked: <span className="text-text-primary font-bold">{event.formLocked ? 'Yes' : 'No'}</span></p>
                </div>
              </div>
            )}

            {/* Participants */}
            {tab === 'participants' && (
              <div className="animate-slide-in">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input type="text" placeholder="Search name or email…" value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)} className="input-brutal w-64" />
                    <select value={partStatusFilter} onChange={(e) => setPartStatusFilter(e.target.value)}
                      className="font-mono text-[11px] bg-transparent border-b-2 border-border text-text-primary py-2 px-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                      <option value="All">All Statuses</option>
                      {['Registered', 'Successful', 'Pending Approval', 'Rejected', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={exportCSV} className="btn-brutal btn-primary bg-success !text-ink hover:shadow-[0_0_20px_rgba(0,255,157,0.4)] flex items-center gap-1">
                    <Download size={12} /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[12px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['Name', 'Email', 'Reg. Date', 'Status', 'Payment', 'Team', 'Attended'].map((h) => (
                          <th key={h} className="text-left px-4 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((r) => (
                        <tr key={r._id} className="border-b border-border hover:bg-ink/50">
                          <td className="px-4 py-2.5 text-text-primary">{r.participantId?.firstName} {r.participantId?.lastName}</td>
                          <td className="px-4 py-2.5 text-text-muted">{r.participantId?.email}</td>
                          <td className="px-4 py-2.5 text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border-l-[3px] ${
                              r.status === 'Successful' ? 'border-success text-success' : r.status === 'Pending Approval' ? 'border-accent-primary text-accent-primary' : 'border-text-muted text-text-muted'
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-2.5 text-text-muted">
                            {r.paymentProof ? <a href={`${BASE_URL}${r.paymentProof}`} target="_blank" rel="noreferrer" className="text-accent-primary hover:underline text-[10px]">View</a>
                              : r.purchasedVariant ? `₹${r.purchasedVariant.price}` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-text-muted text-[10px]">{r.ticketId?.teamId?.teamName || '-'}</td>
                          <td className="px-4 py-2.5">{r.attended ? <span className="text-success">✓</span> : '-'}</td>
                        </tr>
                      ))}
                      {filteredParticipants.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-text-muted">No registrations found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit */}
            {tab === 'edit' && editForm && (
              <div className="space-y-4 animate-slide-in">
                {event.formLocked && (
                  <div className="border border-accent-primary/30 bg-accent-primary/5 p-3">
                    <p className="font-mono text-[11px] text-accent-primary">[!] Form is locked (first registration received). Fields cannot be changed.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Event Name</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-brutal w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Description</label>
                    <textarea value={editForm.description} rows={3} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary resize-none" />
                  </div>
                  {[['venue', 'Venue', 'text'], ['fee', 'Fee (₹)', 'number'], ['registrationLimit', 'Reg. Limit', 'number']].map(([k, label, type]) => (
                    <div key={k}>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">{label}</label>
                      <input type={type} value={editForm[k]} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })} className="input-brutal w-full" />
                    </div>
                  ))}
                  {[['startDate', 'Start Date'], ['endDate', 'End Date'], ['registrationDeadline', 'Reg. Deadline']].map(([k, label]) => (
                    <div key={k}>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">{label}</label>
                      <input type="datetime-local" value={editForm[k]} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                        className="w-full font-mono text-[11px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Tags (comma separated)</label>
                    <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="input-brutal w-full" />
                  </div>
                </div>
                {event.type === 'Normal' && !event.formLocked && (
                  <div>
                    <div className="flex items-center justify-between mt-4 mb-2">
                      <h3 className="font-heading text-sm text-text-primary">Registration Form Fields</h3>
                      <button onClick={addField} className="btn-brutal btn-ghost !text-[10px] !py-1 !px-3 flex items-center gap-1"><Plus size={10} /> Add Field</button>
                    </div>
                    <div className="space-y-3">
                      {customForm.map((field, idx) => (
                        <div key={field.fieldId} className="border border-border bg-ink p-3">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <input type="text" placeholder="Label" value={field.label} onChange={(e) => updateField(idx, 'label', e.target.value)} className="col-span-2 input-brutal" />
                            <select value={field.type} onChange={(e) => updateField(idx, 'type', e.target.value)}
                              className="font-mono text-[11px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                            <input type="text" placeholder="Options (comma separated)" value={(field.options || []).join(',')}
                              onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map((o) => o.trim()))} className="input-brutal w-full mb-2" />
                          )}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 font-mono text-[10px] text-text-secondary cursor-pointer">
                              <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} className="accent-[#E8FF00]" /> Required
                            </label>
                            <div className="flex gap-2">
                              <button onClick={() => moveField(idx, 'up')} className="text-text-muted hover:text-accent-primary"><ChevronUp size={14} /></button>
                              <button onClick={() => moveField(idx, 'down')} className="text-text-muted hover:text-accent-primary"><ChevronDown size={14} /></button>
                              <button onClick={() => removeField(idx)} className="font-mono text-[10px] text-error hover:underline uppercase tracking-wider">Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={saveEdits} className="btn-brutal btn-primary mt-2">Save Changes</button>
              </div>
            )}

            {/* Attendance */}
            {tab === 'attendance' && (
              <div className="animate-slide-in">
                <div className="flex flex-wrap gap-3 mb-6">
                  {!scannerActive ? (
                    <button onClick={startScanner} className="btn-brutal btn-primary flex items-center gap-1"><Camera size={12} /> Start QR Scanner</button>
                  ) : (
                    <button onClick={stopScanner} className="btn-brutal btn-danger flex items-center gap-1"><Square size={12} /> Stop Scanner</button>
                  )}
                  <button onClick={exportAttendance} className="btn-brutal btn-primary bg-success !text-ink flex items-center gap-1"><Download size={12} /> Export Attendance</button>
                </div>
                {scanMsg && <div className="mb-4 border border-border bg-ink p-3 font-mono text-[12px] text-text-primary">{scanMsg}</div>}
                <div id="qr-reader-org" ref={qrRef} className={`mb-6 overflow-hidden ${!scannerActive ? 'hidden' : ''}`} style={{ width: '100%', maxWidth: 400 }} />
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    ['Total Registered', registrationList.length, 'text-accent-tertiary'],
                    ['Attended', attendanceData.filter((t) => t.attended).length, 'text-success'],
                    ['Not Attended', attendanceData.filter((t) => !t.attended).length, 'text-text-muted'],
                  ].map(([label, val, color]) => (
                    <div key={label} className="bg-ink border border-border p-4 text-center">
                      <p className={`font-display text-2xl tracking-wider ${color}`}>{val}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[12px]">
                    <thead><tr className="border-b border-border">
                      {['Ticket ID', 'Participant', 'Attended', 'Checked In'].map((h) => (
                        <th key={h} className="text-left px-4 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {attendanceData.map((t) => (
                        <tr key={t._id} className="border-b border-border hover:bg-ink/50">
                          <td className="px-4 py-2.5 text-[10px] text-text-muted">{t.ticketId}</td>
                          <td className="px-4 py-2.5 text-text-primary">{t.participantId?.firstName} {t.participantId?.lastName}</td>
                          <td className="px-4 py-2.5">{t.attended ? <span className="text-success">✓ Yes</span> : <span className="text-text-muted">-</span>}</td>
                          <td className="px-4 py-2.5 text-text-muted">{t.checkedInAt ? new Date(t.checkedInAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                      {attendanceData.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-text-muted">No ticket data yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments */}
            {tab === 'payments' && (
              <div className="animate-slide-in">
                <h3 className="font-heading text-base text-text-primary mb-4">Pending Payment Approvals</h3>
                {pendingApprovals.length === 0 ? (
                  <p className="text-center font-mono text-[12px] text-text-muted py-8">No pending approvals</p>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((reg) => (
                      <div key={reg._id} className="border border-border p-4 flex items-start gap-4">
                        {reg.paymentProof && (
                          <img src={`${BASE_URL}${reg.paymentProof}`} alt="Payment proof" className="w-24 h-24 object-cover border border-border" />
                        )}
                        <div className="flex-1">
                          <p className="font-heading text-sm text-text-primary">{reg.participantId?.firstName} {reg.participantId?.lastName}</p>
                          <p className="font-mono text-[10px] text-text-muted">{reg.participantId?.email}</p>
                          {reg.purchasedVariant && (
                            <p className="font-mono text-[11px] text-text-secondary mt-1">
                              {reg.purchasedVariant.size} / {reg.purchasedVariant.color} - ₹{reg.purchasedVariant.price}
                            </p>
                          )}
                          <p className="font-mono text-[9px] text-text-muted mt-1">{new Date(reg.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => approvePayment(reg._id)} className="btn-brutal btn-primary bg-success !text-ink !text-[10px] !py-1 !px-3">Approve</button>
                          <button onClick={() => rejectPayment(reg._id)} className="btn-brutal btn-danger !text-[10px] !py-1 !px-3">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Forum */}
            {tab === 'forum' && (
              <div className="animate-slide-in">
                <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> Event Forum
                  <span className="font-mono text-[10px] text-text-muted ml-2">({forumMessages.filter(m => !m.deletedAt).length} messages)</span>
                </h3>

                {/* Pinned messages */}
                {forumMessages.filter(m => m.isPinned && !m.deletedAt).length > 0 && (
                  <div className="mb-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2 flex items-center gap-1"><Pin size={10} /> Pinned</p>
                    {forumMessages.filter(m => m.isPinned && !m.deletedAt).map((msg) => (
                      <div key={msg._id} className="border border-accent-primary/30 bg-accent-primary/5 p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-sm text-text-primary">{msg.authorName}</span>
                            <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                              msg.authorRole === 'Organizer' ? 'border-accent-secondary text-accent-secondary' : 'border-border text-text-muted'
                            }`}>{msg.authorRole}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handlePinMessage(msg._id)} title="Unpin" className="text-accent-primary hover:text-accent-secondary transition-colors"><Pin size={12} /></button>
                            <button onClick={() => handleDeleteMessage(msg._id)} title="Delete" className="text-text-muted hover:text-error transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p className="font-mono text-[12px] text-text-secondary">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages list */}
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4 pr-1 scrollbar-hide">
                  {forumMessages.filter(m => !m.isPinned && !m.deletedAt).length === 0 && (
                    <p className="text-center font-mono text-[12px] text-text-muted py-8">No messages yet.</p>
                  )}
                  {forumMessages.filter(m => !m.isPinned && !m.deletedAt).map((msg) => (
                    <div key={msg._id} className="bg-ink border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-sm text-text-primary">{msg.authorName}</span>
                          <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                            msg.authorRole === 'Organizer' ? 'border-accent-secondary text-accent-secondary' : 'border-border text-text-muted'
                          }`}>{msg.authorRole}</span>
                          <span className="font-mono text-[9px] text-text-muted">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setReplyTo(msg)} title="Reply" className="text-text-muted hover:text-accent-primary transition-colors"><Reply size={12} /></button>
                          <button onClick={() => handlePinMessage(msg._id)} title="Pin" className="text-text-muted hover:text-accent-primary transition-colors"><Pin size={12} /></button>
                          <button onClick={() => handleDeleteMessage(msg._id)} title="Delete" className="text-text-muted hover:text-error transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {msg.replyTo && (
                        <div className="border-l-2 border-border pl-2 mb-1">
                          <p className="font-mono text-[10px] text-text-muted italic">{typeof msg.replyTo === 'object' ? msg.replyTo.content?.slice(0, 60) : 'Reply'}</p>
                        </div>
                      )}
                      <p className="font-mono text-[12px] text-text-secondary">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply indicator */}
                {replyTo && (
                  <div className="flex items-center gap-2 mb-2 px-2 py-1 border-l-2 border-accent-primary bg-accent-primary/5">
                    <Reply size={10} className="text-accent-primary" />
                    <p className="font-mono text-[10px] text-text-muted flex-1">Replying to {replyTo.authorName}: {replyTo.content?.slice(0, 40)}...</p>
                    <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-error font-mono text-[10px]">x</button>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Post announcement or reply..."
                    className="flex-1 input-brutal" />
                  <button onClick={handleSendMessage} disabled={!newMessage.trim()}
                    className="btn-brutal btn-primary !py-2 !px-4 flex items-center gap-1">
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {tab === 'feedback' && (
              <div className="animate-slide-in">
                <h3 className="font-heading text-base text-text-primary mb-4">Anonymous Feedback Summary</h3>
                {!feedbackSummary || feedbackSummary.count === 0 ? (
                  <div className="text-center py-12">
                    <p className="font-mono text-[12px] text-text-muted">No feedback received yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-ink border border-border p-6 text-center">
                        <p className="font-display text-4xl tracking-wider text-accent-primary">{feedbackSummary.averageRating}</p>
                        <div className="flex justify-center mt-1 gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} size={16} className={s <= Math.round(feedbackSummary.averageRating) ? 'text-accent-primary fill-accent-primary' : 'text-text-muted'} />)}
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-2">Average Rating</p>
                      </div>
                      <div className="bg-ink border border-border p-6 text-center">
                        <p className="font-display text-4xl tracking-wider text-accent-tertiary">{feedbackSummary.count}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-2">Total Responses</p>
                      </div>
                    </div>
                    <div className="bg-ink border border-border p-4">
                      <h4 className="font-heading text-sm text-text-primary mb-3">Rating Distribution</h4>
                      {[5,4,3,2,1].map(star => {
                        const count = feedbackSummary.distribution[star] || 0;
                        const pct = feedbackSummary.count > 0 ? Math.round((count / feedbackSummary.count) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 font-mono text-[11px] mb-2">
                            <span className="w-6 text-text-muted">{star}★</span>
                            <div className="flex-1 h-2 bg-border"><div className="h-2 bg-accent-primary transition-all" style={{ width: `${pct}%` }} /></div>
                            <span className="w-16 text-text-muted text-right">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                    {feedbackSummary.comments?.length > 0 && (
                      <div>
                        <h4 className="font-heading text-sm text-text-primary mb-3">Comments ({feedbackSummary.comments.length})</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                          {feedbackSummary.comments.map((c, i) => (
                            <div key={i} className="border border-border bg-ink p-3">
                              <div className="flex items-center gap-1 mb-1">
                                {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= c.rating ? 'text-accent-primary fill-accent-primary' : 'text-text-muted'} />)}
                                <span className="font-mono text-[9px] text-text-muted ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="font-mono text-[12px] text-text-secondary">{c.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
