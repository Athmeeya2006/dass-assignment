import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { CalendarDays, Users, DollarSign, PlusCircle, Radio, ChevronRight, ChevronLeft, TrendingUp, BarChart2 } from 'lucide-react';

const STATUS_TABS = ['All', 'Draft', 'Published', 'Ongoing', 'Completed', 'Closed'];

const statusConfig = {
  Draft:     { border: 'border-text-muted', text: 'text-text-muted', dot: 'bg-text-muted' },
  Published: { border: 'border-accent-tertiary', text: 'text-accent-tertiary', dot: 'bg-accent-tertiary' },
  Ongoing:   { border: 'border-success', text: 'text-success', dot: 'bg-success animate-pulse' },
  Completed: { border: 'border-accent-secondary', text: 'text-accent-secondary', dot: 'bg-accent-secondary' },
  Closed:    { border: 'border-error', text: 'text-error', dot: 'bg-error' },
};

const CarouselCard = ({ event }) => {
  const cfg = statusConfig[event.status] || statusConfig.Draft;
  return (
    <Link to={`/organizer/event/${event._id}`}
      className="group shrink-0 w-56 bg-surface border border-border hover:border-accent-primary transition-all overflow-hidden flex flex-col">
      <div className={`h-1 border-t-[3px] ${cfg.border}`} />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border ${cfg.border} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 ${cfg.dot}`} />{event.status}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 border border-border text-text-muted">{event.type}</span>
          </div>
          <p className="font-heading text-sm text-text-primary leading-snug line-clamp-2 group-hover:text-accent-primary transition-colors">{event.name}</p>
        </div>
        <div className="mt-auto flex items-center justify-between font-mono text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><Users size={10} />{event.totalRegistrations ?? 0}</span>
          <span className="flex items-center gap-1 text-accent-primary">Manage <ChevronRight size={10} /></span>
        </div>
      </div>
    </Link>
  );
};

const EventRow = ({ event }) => {
  const cfg = statusConfig[event.status] || statusConfig.Draft;
  return (
    <Link to={`/organizer/event/${event._id}`}
      className="group flex items-center gap-4 p-4 bg-surface hover:bg-ink border-b border-border last:border-0 transition-colors">
      <div className={`w-1 h-10 ${cfg.border} border-l-[3px]`} />
      <div className="flex-1 min-w-0">
        <p className="font-heading text-sm text-text-primary truncate group-hover:text-accent-primary">{event.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border ${cfg.border} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 ${cfg.dot}`} />{event.status}
          </span>
          <span className="font-mono text-[9px] text-text-muted">{event.type}</span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end font-mono text-[10px] text-text-muted shrink-0">
        <span className="text-text-primary">{event.totalRegistrations ?? 0} regs</span>
        <span>₹{((event.fee || 0) * (event.totalRegistrations || 0)).toLocaleString()}</span>
      </div>
      <div className="hidden md:block font-mono text-[10px] text-text-muted shrink-0">
        {event.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
      </div>
      <ChevronRight size={14} className="text-text-muted group-hover:text-accent-primary shrink-0 transition-colors" />
    </Link>
  );
};

const OrganizerDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [error, setError] = useState('');
  const carouselRef = useRef(null);

  useEffect(() => {
    axiosInstance.get('/organizer/events')
      .then(r => setEvents(r.data))
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => { carouselRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' }); };
  const filtered = activeTab === 'All' ? events : events.filter(e => e.status === activeTab);
  const totalRegs = events.reduce((sum, e) => sum + (e.totalRegistrations || 0), 0);
  const totalRevenue = events.reduce((sum, e) => sum + ((e.fee || 0) * (e.totalRegistrations || 0)), 0);
  const activeCount = events.filter(e => ['Published', 'Ongoing'].includes(e.status)).length;
  const completedEvents = events.filter(e => ['Completed', 'Closed'].includes(e.status));
  const completedRegs = completedEvents.reduce((sum, e) => sum + (e.totalRegistrations || 0), 0);
  const completedRevenue = completedEvents.reduce((sum, e) => sum + ((e.fee || 0) * (e.totalRegistrations || 0)), 0);
  const completedAttendance = completedEvents.reduce((sum, e) => sum + (e.attendanceCount || 0), 0);

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-wider text-text-primary">DASHBOARD</h1>
            <p className="font-mono text-[12px] text-text-muted mt-1">Manage your events and track performance.</p>
          </div>
          <Link to="/organizer/create-event"
            className="btn-brutal btn-primary flex items-center gap-2 w-fit">
            <PlusCircle size={14} /> Create Event
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CalendarDays, label: 'Total Events', value: loading ? '…' : events.length, color: 'text-accent-primary' },
            { icon: Radio, label: 'Active Events', value: loading ? '…' : activeCount, color: 'text-success' },
            { icon: Users, label: 'Registrations', value: loading ? '…' : totalRegs, color: 'text-accent-tertiary' },
            { icon: DollarSign, label: 'Revenue', value: loading ? '…' : `₹${totalRevenue.toLocaleString()}`, color: 'text-accent-secondary' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-surface border border-border p-5">
              <div className="flex items-center gap-3">
                <Icon size={18} className={color} />
                <div>
                  <p className="font-display text-2xl tracking-wider text-text-primary">{value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completed Events Analytics */}
        {completedEvents.length > 0 && (
          <div className="bg-surface border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <TrendingUp size={14} className="text-accent-secondary" />
              <h2 className="font-heading text-sm text-text-primary">Completed Events Analytics</h2>
              <span className="font-mono text-[9px] px-2 py-0.5 border border-border text-text-muted">{completedEvents.length} events</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              {[
                { label: 'Registrations', value: completedRegs, color: 'text-accent-tertiary' },
                { label: 'Sales (Merch)', value: completedEvents.filter(e => e.type === 'Merchandise').reduce((s, e) => s + (e.totalRegistrations || 0), 0), color: 'text-accent-primary' },
                { label: 'Revenue', value: `₹${completedRevenue.toLocaleString()}`, color: 'text-accent-secondary' },
                { label: 'Attendance', value: completedAttendance, color: 'text-success' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-ink border border-border p-4 text-center">
                  <p className={`font-display text-2xl tracking-wider ${color}`}>{value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carousel */}
        {error ? (
          <div className="border border-error/30 bg-error/5 p-3"><p className="font-mono text-[12px] text-error">{error}</p></div>
        ) : (
          <div className="bg-surface border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart2 size={14} className="text-accent-primary" />
                <h2 className="font-heading text-sm text-text-primary">Events Carousel</h2>
                <span className="font-mono text-[9px] px-2 py-0.5 border border-border text-text-muted">{events.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scroll(-1)} className="w-7 h-7 border border-border flex items-center justify-center hover:border-accent-primary hover:text-accent-primary text-text-muted transition-colors"><ChevronLeft size={14} /></button>
                <button onClick={() => scroll(1)} className="w-7 h-7 border border-border flex items-center justify-center hover:border-accent-primary hover:text-accent-primary text-text-muted transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
            {loading ? (
              <div className="flex gap-4 p-5 overflow-hidden">
                {[1,2,3,4].map(i => <div key={i} className="shrink-0 w-56 h-28 bg-ink border border-border animate-pulse" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-14">
                <CalendarDays size={28} className="mx-auto mb-3 text-text-muted opacity-30" />
                <p className="font-mono text-[12px] text-text-muted">No events yet</p>
                <Link to="/organizer/create-event" className="font-mono text-[11px] text-accent-primary hover:underline mt-2 inline-flex items-center gap-1">
                  <PlusCircle size={10} /> Create your first event
                </Link>
              </div>
            ) : (
              <div ref={carouselRef} className="flex gap-4 p-5 overflow-x-auto scrollbar-hide scroll-smooth">
                {events.map(event => <CarouselCard key={event._id} event={event} />)}
              </div>
            )}
          </div>
        )}

        {/* All Events */}
        {!loading && events.length > 0 && (
          <div className="bg-surface border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
              <TrendingUp size={14} className="text-accent-primary" />
              <h2 className="font-heading text-sm text-text-primary">All Events</h2>
              <div className="flex gap-1.5 flex-wrap ml-auto">
                {STATUS_TABS.map(tab => {
                  const count = tab === 'All' ? events.length : events.filter(e => e.status === tab).length;
                  if (count === 0 && tab !== 'All') return null;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 border transition-colors ${
                        activeTab === tab ? 'bg-accent-primary text-ink border-accent-primary' : 'border-border text-text-muted hover:text-text-secondary'
                      }`}>
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              {filtered.length === 0 ? (
                <p className="text-center font-mono text-[12px] text-text-muted py-10">No {activeTab} events</p>
              ) : (
                filtered.map(event => <EventRow key={event._id} event={event} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
