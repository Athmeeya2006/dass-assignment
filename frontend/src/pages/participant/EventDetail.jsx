import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance, { BASE_URL } from '../../api/axios';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, Users, Tag, DollarSign, ArrowLeft, Send, Pin, Trash2, Reply, Star, Upload, ShoppingBag, MessageSquare, UserPlus, Award } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageLoader } from '../../components/ui/Skeleton';

const EventDetail = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [formResponses, setFormResponses] = useState({});
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [initialTabSet, setInitialTabSet] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [myTeam, setMyTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [teamError, setTeamError] = useState('');
  const [myFeedback, setMyFeedback] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => { fetchEvent(); checkRegistration(); }, [eventId]);

  useEffect(() => {
    if (activeTab === 'forum') { fetchMessages(); setupSocket(); }
    if (activeTab === 'team') { fetchMyTeam(); }
    return () => {
      // Only disconnect socket when component unmounts or eventId changes, not on tab switch
      if (activeTab === 'forum' && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeTab, eventId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const setupSocket = () => {
    if (socketRef.current) socketRef.current.disconnect();
    const token = localStorage.getItem('token');
    const socket = io(BASE_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('join-event', eventId);
    socket.on('message-received', (data) => setMessages((prev) => [...prev, data]));
    socket.on('message-deleted-event', (data) => setMessages((prev) => prev.filter((m) => m._id !== data.messageId)));
    socket.on('message-pinned-event', (data) => setMessages((prev) => prev.map((m) => (m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m))));
  };

  const fetchEvent = async () => {
    try {
      const res = await axiosInstance.get(`/event/${eventId}`);
      setEvent(res.data);
      if (res.data.status === 'Completed' || res.data.status === 'Closed') {
        try {
          const fbRes = await axiosInstance.get(`/feedback/${eventId}/my-feedback`);
          if (fbRes.data) { setMyFeedback(fbRes.data); setFeedbackRating(fbRes.data.rating); setFeedbackComment(fbRes.data.comment); }
        } catch (e) { console.error('Feedback fetch error:', e); }
      }
    } catch (error) { setError('Failed to load event details.'); } finally { setLoading(false); }
  };

  const checkRegistration = async () => {
    try {
      const res = await axiosInstance.get('/participant/registration-history');
      const found = res.data.find((r) => r.eventId?._id === eventId || r.eventId === eventId);
      if (found) setRegistration(found);
    } catch (err) { console.error('Registration check error:', err); }
  };

  const fetchMessages = async () => {
    try { const res = await axiosInstance.get(`/event/${eventId}/messages`); setMessages(res.data); } catch (err) { console.error('Messages fetch error:', err); }
  };

  const fetchMyTeam = async () => {
    try { const res = await axiosInstance.get(`/team/${eventId}/my-team`); setMyTeam(res.data.team || null); } catch (_) { setMyTeam(null); }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { setTeamError('Enter a team name'); return; }
    setTeamLoading(true); setTeamError('');
    try { const res = await axiosInstance.post(`/team/${eventId}/create`, { teamName: newTeamName }); setMyTeam(res.data.team); setNewTeamName(''); }
    catch (err) { setTeamError(err.response?.data?.error || 'Failed to create team'); } finally { setTeamLoading(false); }
  };

  const handleJoinTeam = async () => {
    if (!inviteCodeInput.trim()) { setTeamError('Enter an invite code'); return; }
    setTeamLoading(true); setTeamError('');
    try { const res = await axiosInstance.post('/team/join', { inviteCode: inviteCodeInput }); setMyTeam(res.data.team); setInviteCodeInput(''); }
    catch (err) { setTeamError(err.response?.data?.error || 'Failed to join team'); } finally { setTeamLoading(false); }
  };

  const handleRespondMember = async (teamId, memberId, status) => {
    try { const res = await axiosInstance.post(`/team/${teamId}/respond/${memberId}`, { status }); setMyTeam(res.data.team); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try { await axiosInstance.post(`/team/${myTeam._id}/leave`); setMyTeam(null); } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleFinalizeTeam = async () => {
    try { const res = await axiosInstance.post(`/team/${myTeam._id}/finalize`); setMyTeam(res.data.team); toast.success('Team registration finalized! Tickets sent to all members.'); checkRegistration(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackRating) { setFeedbackError('Please select a rating'); return; }
    setFeedbackLoading(true); setFeedbackError('');
    try { const res = await axiosInstance.post(`/feedback/${eventId}`, { rating: feedbackRating, comment: feedbackComment }); setMyFeedback(res.data.feedback); }
    catch (err) { setFeedbackError(err.response?.data?.error || 'Failed to submit feedback'); } finally { setFeedbackLoading(false); }
  };

  const handleRegisterNormal = async () => {
    const missingFields = (event.customForm || []).filter((f) => f.required && !formResponses[f.fieldId]).map((f) => f.label);
    if (missingFields.length > 0) { toast.error(`Please fill required fields: ${missingFields.join(', ')}`); return; }
    setRegisterLoading(true);
    try {
      // Check if there are file fields to upload
      const fileKeys = Object.keys(formResponses).filter((k) => k.startsWith('_file_'));
      let res;
      if (fileKeys.length > 0) {
        const fd = new FormData();
        const cleanResponses = {};
        for (const [k, v] of Object.entries(formResponses)) {
          if (k.startsWith('_file_')) {
            const fieldId = k.replace('_file_', '');
            fd.append(fieldId, v);
          } else {
            cleanResponses[k] = v;
          }
        }
        fd.append('formResponses', JSON.stringify(cleanResponses));
        res = await axiosInstance.post(`/participant/register/${eventId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await axiosInstance.post(`/participant/register/${eventId}`, { formResponses });
      }
      toast.success('Registration successful! Check your email for ticket.'); setRegistration(res.data.registration);
    }
    catch (err) { toast.error(err.response?.data?.error || 'Registration failed'); } finally { setRegisterLoading(false); }
  };

  const handlePurchaseMerchandise = async () => {
    if (!selectedVariant) { toast.error('Please select a variant'); return; }
    setRegisterLoading(true);
    try { const res = await axiosInstance.post(`/participant/purchase-merchandise/${eventId}`, { variantId: selectedVariant, quantity }); setRegistration(res.data.registration); toast.success('Purchase initiated! Please upload payment proof.'); }
    catch (err) { toast.error(err.response?.data?.error || 'Purchase failed'); } finally { setRegisterLoading(false); }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentProof) { toast.error('Please select an image'); return; }
    setUploadLoading(true);
    const formData = new FormData(); formData.append('paymentProof', paymentProof);
    try { await axiosInstance.post(`/participant/upload-payment-proof/${registration._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Payment proof uploaded. Awaiting organizer approval.'); checkRegistration(); }
    catch (err) { toast.error('Upload failed'); } finally { setUploadLoading(false); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try { const res = await axiosInstance.post(`/event/${eventId}/messages`, { content: newMessage, replyTo: replyTo?._id || null }); socketRef.current?.emit('new-message', { eventId, ...res.data }); setNewMessage(''); setReplyTo(null); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to send message'); }
  };

  const handleDeleteMessage = async (messageId) => {
    try { await axiosInstance.delete(`/event/message/${messageId}`); socketRef.current?.emit('message-deleted', { eventId, messageId }); setMessages((prev) => prev.filter((m) => m._id !== messageId)); }
    catch (err) { toast.error('Failed to delete'); }
  };



  const renderFormField = (field) => {
    const val = formResponses[field.fieldId] || '';
    const onChange = (v) => setFormResponses({ ...formResponses, [field.fieldId]: v });
    const inputCls = "w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-muted";
    switch (field.type) {
      case 'textarea': return <textarea className={`${inputCls} resize-none`} value={val} onChange={(e) => onChange(e.target.value)} rows={3} />;
      case 'dropdown': return (
        <select className={`${inputCls} appearance-none cursor-pointer`} value={val} onChange={(e) => onChange(e.target.value)}>
          <option value="">-- Select --</option>
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
      case 'checkbox': return (
        <div className="space-y-2">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer font-mono text-[12px] text-text-secondary">
              <input type="checkbox" checked={Array.isArray(val) ? val.includes(opt) : false} className="accent-[#E8FF00]"
                onChange={(e) => { const arr = Array.isArray(val) ? [...val] : []; onChange(e.target.checked ? [...arr, opt] : arr.filter((o) => o !== opt)); }} />
              {opt}
            </label>
          ))}
        </div>
      );
      case 'radio': return (
        <div className="space-y-2">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer font-mono text-[12px] text-text-secondary">
              <input type="radio" name={field.fieldId} value={opt} checked={val === opt} onChange={() => onChange(opt)} className="accent-[#E8FF00]" />
              {opt}
            </label>
          ))}
        </div>
      );
      case 'file': return (
        <div>
          <input type="file" className="font-mono text-[12px] text-text-secondary file:mr-3 file:py-1 file:px-3 file:border file:border-border file:bg-surface file:text-accent-primary file:font-mono file:text-[10px] file:uppercase file:tracking-wider file:cursor-pointer" onChange={(e) => { const file = e.target.files[0]; if (file) { onChange(file.name); setFormResponses((prev) => ({ ...prev, [`_file_${field.fieldId}`]: file })); } }} />
          {val && <p className="font-mono text-[10px] text-success mt-1">Selected: {val}</p>}
        </div>
      );
      case 'number': return <input type="number" className={inputCls} value={val} onChange={(e) => onChange(e.target.value)} />;
      default: return <input type="text" className={inputCls} value={val} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  const isDeadlinePassed = event?.registrationDeadline && new Date() > new Date(event.registrationDeadline);
  const isFull = event?.registrationLimit && event.participantCount >= event.registrationLimit;
  const canRegister = event && !registration && !isDeadlinePassed && !isFull && (event.status === 'Published' || event.status === 'Ongoing');
  const isCompleted = event && (event.status === 'Completed' || event.status === 'Closed');

  // Auto-switch to register tab if user can register and hasn't navigated yet
  useEffect(() => {
    if (!initialTabSet && event && !loading) {
      if (canRegister && !registration) {
        setActiveTab('register');
      }
      setInitialTabSet(true);
    }
  }, [event, loading, canRegister, registration, initialTabSet]);

  if (loading) return <PageLoader />;
  if (!event) return <div className="min-h-screen bg-ink flex justify-center items-center font-mono text-text-muted">Event not found</div>;

  const pinnedMessages = messages.filter((m) => m.isPinned && !m.deletedAt);
  const regularMessages = messages.filter((m) => !m.isPinned && !m.deletedAt);

  const availableTabs = [
    'details',
    ...(event.teamRegistration && event.type === 'Normal' ? ['team'] : []),
    ...(event.teamRegistration && event.type === 'Normal' ? [] : ['register']),
    'forum',
    ...(isCompleted && registration ? ['feedback'] : []),
  ];

  const statusColor = event.status === 'Published' ? 'text-success border-success' : event.status === 'Ongoing' ? 'text-accent-primary border-accent-primary' : 'text-text-muted border-text-muted';

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link to="/participant/browse" className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-accent-primary transition-colors uppercase tracking-wider mb-6">
          <ArrowLeft size={12} /> Back to events
        </Link>

        {/* Event Header */}
        <div className="bg-surface border border-border overflow-hidden mb-6">
          <div className="mesh-bg p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
            </div>
            <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 border ${event.type === 'Merchandise' ? 'border-accent-secondary text-accent-secondary' : 'border-accent-tertiary text-accent-tertiary'}`}>
                    {event.type}
                  </span>
                  <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 border ${statusColor}`}>
                    {event.status}
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl tracking-wider text-text-primary mb-2">{event.name.toUpperCase()}</h1>
                <p className="font-mono text-[13px] text-accent-primary">by {event.organizerId?.name}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-border px-6 overflow-x-auto scrollbar-hide">
            <nav className="flex gap-0">
              {availableTabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`font-mono text-[11px] uppercase tracking-[0.1em] px-5 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}>
                  {tab === 'forum' ? 'Forum' : tab === 'team' ? 'Team' : tab === 'feedback' ? 'Feedback' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="animate-slide-in">
                <p className="font-mono text-[13px] text-text-secondary leading-relaxed mb-6">{event.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Start Date', value: event.startDate ? new Date(event.startDate).toLocaleDateString() : '-', icon: Calendar },
                    { label: 'End Date', value: event.endDate ? new Date(event.endDate).toLocaleDateString() : '-', icon: Calendar },
                    { label: 'Deadline', value: event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString() : '-', icon: Clock },
                    { label: 'Eligibility', value: event.eligibility || 'Open to All', icon: Users },
                    { label: 'Fee', value: event.fee ? `₹${event.fee}` : 'Free', icon: DollarSign },
                    { label: 'Slots', value: event.registrationLimit ? `${event.participantCount || 0} / ${event.registrationLimit}` : 'Unlimited', icon: Users },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-ink border border-border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={10} className="text-text-muted" />
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted">{label}</p>
                      </div>
                      <p className="font-heading text-sm text-text-primary">{value}</p>
                    </div>
                  ))}
                </div>
                {event.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span key={tag} className="font-mono text-[10px] text-accent-primary px-2 py-1 border border-accent-primary/30 bg-accent-primary/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* Quick Register/Purchase CTA on details tab */}
                {canRegister && (
                  <button onClick={() => setActiveTab('register')}
                    className="w-full btn-brutal btn-primary mt-6 flex items-center justify-center gap-2">
                    {event.type === 'Merchandise' ? <><ShoppingBag size={16} /> Purchase Now</> : <><UserPlus size={16} /> Register Now</>}
                  </button>
                )}
                {registration && (
                  <div className="mt-6 border border-success/30 bg-success/5 p-3 text-center">
                    <p className="font-mono text-[12px] text-success">You are registered for this event</p>
                    {registration.ticketId && (
                      <Link to={`/participant/ticket/${registration.ticketId?.ticketId || registration.ticketId}`}
                        className="btn-brutal btn-primary !text-[11px] !py-2 !px-4 mt-2 inline-flex items-center gap-1">
                        View Ticket
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="animate-slide-in">
                {teamError && (
                  <div className="border border-error/30 border-l-[3px] border-l-error bg-error/5 px-4 py-3 mb-4">
                    <p className="font-mono text-[12px] text-error">{teamError}</p>
                  </div>
                )}
                {!myTeam ? (
                  <div className="space-y-6">
                    <div className="border border-border p-5">
                      <h3 className="font-heading text-sm text-text-primary mb-3">Create a Team</h3>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Team name" value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)} className="input-brutal flex-1" />
                        <button onClick={handleCreateTeam} disabled={teamLoading} className="btn-brutal btn-primary">
                          {teamLoading ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </div>
                    <div className="border border-border p-5">
                      <h3 className="font-heading text-sm text-text-primary mb-3">Join with Invite Code</h3>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Enter invite code" value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value)} className="input-brutal flex-1 !font-mono" />
                        <button onClick={handleJoinTeam} disabled={teamLoading} className="btn-brutal btn-primary bg-success !text-ink hover:shadow-[0_0_20px_rgba(0,255,157,0.4)]">
                          {teamLoading ? 'Joining...' : 'Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-accent-primary/30 bg-accent-primary/5 p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="font-display text-2xl tracking-wider text-text-primary">{myTeam.teamName?.toUpperCase()}</h3>
                        <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border-l-[3px] ${
                          myTeam.status === 'Complete' ? 'border-success text-success' : myTeam.status === 'Forming' ? 'border-accent-primary text-accent-primary' : 'border-error text-error'
                        }`}>{myTeam.status}</span>
                      </div>
                      {String(myTeam.leaderId?._id || myTeam.leaderId) === String(user?._id) && myTeam.status === 'Forming' && (
                        <div className="text-right">
                          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Invite Code</p>
                          <code className="bg-ink border border-border px-3 py-1 font-mono text-[13px] text-accent-primary select-all">{myTeam.inviteCode}</code>
                        </div>
                      )}
                    </div>

                    <div className="border border-border p-4">
                      <h4 className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted mb-3">
                        Members ({(myTeam.members?.length || 0) + 1}/{myTeam.maxSize})
                      </h4>
                      <div className="flex items-center gap-3 py-3 border-b border-border">
                        <div className="w-8 h-8 bg-accent-primary text-ink flex items-center justify-center font-mono text-[12px] font-bold">
                          {(myTeam.leaderId?.firstName || 'L')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-heading text-sm text-text-primary">{myTeam.leaderId?.firstName} {myTeam.leaderId?.lastName}</p>
                          <p className="font-mono text-[10px] text-text-muted">{myTeam.leaderId?.email}</p>
                        </div>
                        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border border-accent-primary text-accent-primary">Leader</span>
                      </div>
                      {myTeam.members?.map((m) => (
                        <div key={m._id} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
                          <div className="w-8 h-8 bg-surface border border-border text-text-muted flex items-center justify-center font-mono text-[12px] font-bold">
                            {(m.participantId?.firstName || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-heading text-sm text-text-primary">{m.participantId?.firstName} {m.participantId?.lastName}</p>
                            <p className="font-mono text-[10px] text-text-muted">{m.participantId?.email}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border-l-[3px] ${
                              m.status === 'Accepted' ? 'border-success text-success' : m.status === 'Pending' ? 'border-accent-primary text-accent-primary' : 'border-error text-error'
                            }`}>{m.status}</span>
                            {m.status === 'Pending' && String(myTeam.leaderId?._id || myTeam.leaderId) === String(user?._id) && (
                              <>
                                <button onClick={() => handleRespondMember(myTeam._id, m._id, 'Accepted')}
                                  className="font-mono text-[9px] uppercase tracking-wider bg-success text-ink px-2 py-1 hover:shadow-[0_0_10px_rgba(0,255,157,0.3)]">Accept</button>
                                <button onClick={() => handleRespondMember(myTeam._id, m._id, 'Rejected')}
                                  className="font-mono text-[9px] uppercase tracking-wider bg-error text-white px-2 py-1">Reject</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {String(myTeam.leaderId?._id || myTeam.leaderId) === String(user?._id) && myTeam.status === 'Forming' && (
                        <button onClick={handleFinalizeTeam} className="btn-brutal btn-primary bg-success !text-ink hover:shadow-[0_0_20px_rgba(0,255,157,0.4)]">
                          Finalize Registration
                        </button>
                      )}
                      <Link to={`/participant/team-chat/${myTeam._id}`} className="btn-brutal btn-ghost flex items-center gap-2">
                        <MessageSquare size={14} /> Team Chat
                      </Link>
                      <button onClick={handleLeaveTeam} className="btn-brutal btn-danger">Leave Team</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="max-w-lg mx-auto animate-slide-in">
                <h3 className="font-heading text-base text-text-primary mb-4 text-center">Anonymous Feedback</h3>
                {myFeedback ? (
                  <div className="border border-success/30 bg-success/5 p-6 text-center">
                    <p className="font-display text-2xl text-success mb-2">SUBMITTED</p>
                    <div className="flex justify-center mt-2 gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={24} className={s <= myFeedback.rating ? 'text-accent-primary fill-accent-primary' : 'text-text-muted'} />
                      ))}
                    </div>
                    {myFeedback.comment && <p className="font-mono text-[12px] text-text-secondary mt-3 italic">"{myFeedback.comment}"</p>}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-3">Rating</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setFeedbackRating(s)}
                            className="transition-transform hover:scale-110">
                            <Star size={28} className={s <= feedbackRating ? 'text-accent-primary fill-accent-primary' : 'text-text-muted'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Comments (optional)</label>
                      <textarea rows={4} value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Share your experience..."
                        className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary p-3 resize-none focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-muted" />
                    </div>
                    {feedbackError && <p className="font-mono text-[12px] text-error">{feedbackError}</p>}
                    <button onClick={handleSubmitFeedback} disabled={feedbackLoading || !feedbackRating}
                      className="w-full btn-brutal btn-primary">
                      {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Register Tab */}
            {activeTab === 'register' && (
              <div className="animate-slide-in">
                {registration ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-accent-primary text-ink flex items-center justify-center mx-auto mb-4">
                      <Award size={28} />
                    </div>
                    <p className="font-display text-2xl tracking-wider text-text-primary mb-2">REGISTERED</p>
                    <p className="font-mono text-[12px] text-text-muted">Status: <span className="text-accent-primary">{registration.status}</span></p>
                    {registration.ticketId && (
                      <Link to={`/participant/ticket/${registration.ticketId?.ticketId || registration.ticketId}`}
                        className="btn-brutal btn-primary mt-4 inline-flex items-center gap-2">
                        View Ticket
                      </Link>
                    )}
                    {(registration.status === 'Pending Approval' && !registration.paymentProof) || (registration.status === 'Rejected') ? (
                      <div className="mt-6 text-left border border-accent-primary/30 bg-accent-primary/5 p-4">
                        <p className="font-heading text-sm text-accent-primary mb-3">{registration.status === 'Rejected' ? 'Re-upload Payment Proof' : 'Upload Payment Proof'}</p>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => setPaymentProof(e.target.files[0])}
                          className="font-mono text-[12px] text-text-secondary mb-3 file:mr-3 file:py-1 file:px-3 file:border file:border-border file:bg-surface file:text-accent-primary file:font-mono file:text-[10px] file:uppercase file:tracking-wider file:cursor-pointer" />
                        <button onClick={handleUploadPaymentProof} disabled={uploadLoading}
                          className="btn-brutal btn-primary !text-[11px] !py-2 !px-4">
                          {uploadLoading ? 'Uploading...' : 'Upload Proof'}
                        </button>
                      </div>
                    ) : null}
                    {registration.paymentProof && registration.status === 'Pending Approval' && (
                      <div className="mt-4 border border-accent-primary/30 bg-accent-primary/5 p-3">
                        <p className="font-mono text-[12px] text-accent-primary">Awaiting organizer approval...</p>
                      </div>
                    )}
                  </div>
                ) : !canRegister ? (
                  <div className="text-center py-8">
                    {isDeadlinePassed && <p className="font-mono text-[13px] text-error">Registration deadline has passed.</p>}
                    {isFull && <p className="font-mono text-[13px] text-error">This event is full.</p>}
                    {event.status !== 'Published' && event.status !== 'Ongoing' && <p className="font-mono text-[13px] text-text-muted">Registrations are not currently open.</p>}
                  </div>
                ) : event.type === 'Merchandise' ? (
                  <div>
                    <h3 className="font-heading text-base text-text-primary mb-4">Select Variant</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {(event.merchandiseDetails?.variants || []).map((v) => (
                        <div key={v.variantId}
                          onClick={() => v.stock > 0 && setSelectedVariant(v.variantId)}
                          className={`border p-3 cursor-pointer transition-all ${
                            selectedVariant === v.variantId ? 'border-accent-primary bg-accent-primary/10' :
                            v.stock === 0 ? 'border-border opacity-30 cursor-not-allowed' :
                            'border-border hover:border-text-muted'
                          }`}>
                          <p className="font-heading text-sm text-text-primary">{v.size} / {v.color}</p>
                          <p className="font-mono text-[11px] text-text-muted">₹{v.price} · {v.stock} left</p>
                        </div>
                      ))}
                    </div>
                    {(event.merchandiseDetails?.variants || []).length === 0 && (
                      <div className="border border-error/30 bg-error/5 p-4 text-center mb-4">
                        <p className="font-mono text-[12px] text-error">No variants available for this merchandise event yet.</p>
                      </div>
                    )}
                    {(event.merchandiseDetails?.variants || []).length > 0 && (
                      <>
                        <div className="mb-4">
                          <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Quantity</label>
                          <input type="number" min={1} max={event.merchandiseDetails?.purchaseLimitPerParticipant || 10}
                            value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-32 input-brutal" />
                        </div>
                        <button onClick={handlePurchaseMerchandise} disabled={registerLoading || !selectedVariant}
                          className="w-full btn-brutal btn-primary">
                          {registerLoading ? 'Processing...' : 'Purchase Now'}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    {event.customForm?.length > 0 ? (
                      <>
                        <h3 className="font-heading text-base text-text-primary mb-4">Registration Form</h3>
                        {event.formLocked && (
                          <div className="border border-accent-primary/30 bg-accent-primary/5 p-3 mb-4">
                            <p className="font-mono text-[11px] text-accent-primary">Form is locked (first submission received)</p>
                          </div>
                        )}
                        <div className="space-y-5 mb-6">
                          {[...event.customForm].sort((a, b) => (a.order || 0) - (b.order || 0)).map((field) => (
                            <div key={field.fieldId}>
                              <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">
                                {field.label}
                                {field.required && <span className="text-error ml-1">*</span>}
                              </label>
                              {renderFormField(field)}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-[13px] text-text-muted mb-4">No special form required. Click below to register.</p>
                    )}
                    <button onClick={handleRegisterNormal} disabled={registerLoading}
                      className="w-full btn-brutal btn-primary">
                      {registerLoading ? 'Registering...' : 'Register Now'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Forum Tab */}
            {activeTab === 'forum' && (
              <div className="animate-slide-in">
                {pinnedMessages.length > 0 && (
                  <div className="mb-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2 flex items-center gap-1"><Pin size={10} /> Pinned</p>
                    {pinnedMessages.map((msg) => (
                      <div key={msg._id} className="border border-accent-primary/30 bg-accent-primary/5 p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading text-sm text-text-primary">{msg.authorName}</span>
                          <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                            msg.authorRole === 'Organizer' ? 'border-accent-secondary text-accent-secondary' : 'border-border text-text-muted'
                          }`}>{msg.authorRole}</span>
                        </div>
                        <p className="font-mono text-[12px] text-text-secondary">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto mb-4 pr-1 scrollbar-hide">
                  {regularMessages.length === 0 && (
                    <p className="text-center font-mono text-[12px] text-text-muted py-8">No messages yet. Start the conversation!</p>
                  )}
                  {regularMessages.map((msg) => (
                    <div key={msg._id} className="bg-ink border border-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-sm text-text-primary">{msg.authorName}</span>
                          <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                            msg.authorRole === 'Organizer' ? 'border-accent-secondary text-accent-secondary' : 'border-border text-text-muted'
                          }`}>{msg.authorRole}</span>
                          <span className="font-mono text-[9px] text-text-muted">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setReplyTo(msg)} className="text-text-muted hover:text-accent-primary transition-colors">
                            <Reply size={12} />
                          </button>
                          {(msg.authorId?._id === user?._id || msg.authorId === user?._id) && (
                            <button onClick={() => handleDeleteMessage(msg._id)} className="text-text-muted hover:text-error transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      {msg.replyTo && <p className="font-mono text-[10px] text-text-muted italic mb-1">↩ Reply</p>}
                      <p className="font-mono text-[12px] text-text-secondary">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {replyTo && (
                  <div className="border border-accent-primary/30 bg-accent-primary/5 p-2 mb-2 flex items-center justify-between">
                    <p className="font-mono text-[11px] text-accent-primary">↩ Replying to: {replyTo.content.substring(0, 50)}...</p>
                    <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-primary">✕</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Write a message..."
                    className="input-brutal flex-1" />
                  <button onClick={handleSendMessage} className="btn-brutal btn-primary !px-4 !py-2">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Organizer Info */}
        {event.organizerId && (
          <div className="bg-surface border border-border p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted mb-3">About the Organizer</h2>
            <Link to={`/participant/organizer/${event.organizerId._id}`} className="hover:underline">
              <p className="font-heading text-base text-accent-primary">{event.organizerId.name}</p>
            </Link>
            <p className="font-mono text-[11px] text-text-muted">{event.organizerId.category}</p>
            {event.organizerId.description && <p className="font-mono text-[12px] text-text-secondary mt-1">{event.organizerId.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
