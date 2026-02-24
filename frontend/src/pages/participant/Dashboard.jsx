import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Ticket, ShoppingBag, CheckCircle, XCircle, Clock, ArrowRight, Search } from 'lucide-react';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', icon: Clock },
  { key: 'normal', label: 'Registered', icon: Ticket },
  { key: 'merchandise', label: 'Merch', icon: ShoppingBag },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const statusConfig = {
  Registered: { cls: 'text-accent-tertiary border-accent-tertiary', dot: 'bg-accent-tertiary' },
  Successful: { cls: 'text-success border-success', dot: 'bg-success' },
  'Pending Approval': { cls: 'text-accent-primary border-accent-primary', dot: 'bg-accent-primary' },
  Rejected: { cls: 'text-error border-error', dot: 'bg-error' },
  Cancelled: { cls: 'text-text-muted border-text-muted', dot: 'bg-text-muted' },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeTab === 'upcoming'
        ? '/participant/upcoming-events'
        : `/participant/registration-history?tab=${activeTab}`;
      const res = await axiosInstance.get(endpoint);
      setRegistrations(res.data);
    } catch (error) {
      setError('Failed to load registrations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTicketId = (reg) => reg.ticketId?.ticketId || reg.ticketId;

  const filtered = registrations.filter(reg => {
    const event = reg.eventId || reg.event;
    if (!search) return true;
    return (event?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero header */}
        <div className="mesh-bg border border-border p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
          </div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-primary mb-1">Welcome back</p>
              <h1 className="font-display text-4xl tracking-wider text-text-primary">
                {(user?.firstName || user?.name || 'PARTICIPANT').toUpperCase()}
              </h1>
              <p className="font-mono text-[12px] text-text-muted mt-2">Track your registrations and tickets here</p>
            </div>
            <Link to="/participant/browse"
              className="btn-brutal btn-primary flex items-center gap-2">
              Browse Events <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-error/30 border-l-[3px] border-l-error bg-error/5 px-4 py-3 mb-4 flex items-center justify-between">
            <span className="font-mono text-[12px] text-error">{error}</span>
            <button onClick={fetchData} className="font-mono text-[11px] text-error hover:underline uppercase tracking-wider">Retry</button>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`tab-pill flex items-center gap-1.5 whitespace-nowrap ${activeTab === key ? 'active' : ''}`}>
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Search events…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-mono text-[12px] bg-transparent border-b border-border text-text-primary pl-5 pr-2 py-2 w-44 focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-muted" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="skeleton bg-surface border border-border p-6 h-48">
                <div className="h-4 bg-border/50 w-3/4 mb-4" />
                <div className="h-3 bg-border/50 w-1/2 mb-3" />
                <div className="h-3 bg-border/50 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar size={48} className="text-text-muted/30 mb-4" strokeWidth={1} />
            <h3 className="font-heading text-lg text-text-secondary mb-1">No events found</h3>
            <p className="font-mono text-[12px] text-text-muted mb-4">Nothing here yet.</p>
            <Link to="/participant/browse" className="font-mono text-[12px] text-accent-primary hover:underline uppercase tracking-wider">
              Browse events &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filtered.map((reg) => {
              const event = reg.eventId || reg.event;
              const ticketRef = getTicketId(reg);
              const sc = statusConfig[reg.status] || statusConfig.Registered;
              const teamName = reg.ticketId?.teamId?.teamName;
              return (
                <div key={reg._id} className="bg-surface border border-border hover:border-accent-primary/50 transition-all group overflow-hidden">
                  <div className={`h-[3px] ${event?.type === 'Merchandise' ? 'bg-accent-secondary' : 'bg-accent-primary'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-heading text-base text-text-primary group-hover:text-accent-primary transition-colors line-clamp-2">
                        {event?.name || 'Unknown Event'}
                      </h3>
                      <span className={`ml-2 flex-shrink-0 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-1 border-l-[3px] bg-surface ${sc.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {reg.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border-l-[2px] ${
                        event?.type === 'Merchandise' ? 'border-accent-secondary text-accent-secondary' : 'border-accent-tertiary text-accent-tertiary'
                      }`}>{event?.type}</span>
                      <p className="font-mono text-[11px] text-text-muted">{event?.organizerId?.name || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-text-muted mb-1">
                      <Calendar size={10} />
                      {event?.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                    {teamName && (
                      <p className="font-mono text-[10px] text-accent-primary mb-1">Team: {teamName}</p>
                    )}
                    {ticketRef && (
                      <p className="font-mono text-[10px] text-text-muted mb-3">Ticket: <span className="text-accent-primary">{typeof ticketRef === 'string' ? ticketRef.substring(0, 8) + '…' : ticketRef}</span></p>
                    )}
                    <div className="flex gap-2">
                      <Link to={`/participant/event/${event?._id}`}
                        className="flex-1 text-center font-mono text-[10px] uppercase tracking-wider border border-border text-text-secondary py-2 hover:border-accent-primary hover:text-accent-primary transition-all">
                        View Event
                      </Link>
                      {ticketRef && (
                        <Link to={`/participant/ticket/${ticketRef}`}
                          className="flex-1 text-center font-mono text-[10px] uppercase tracking-wider bg-accent-primary text-ink py-2 flex items-center justify-center gap-1 hover:shadow-[0_0_15px_rgba(232,255,0,0.3)] transition-all">
                          <Ticket size={10} /> Ticket
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
