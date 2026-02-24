import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { QrCode, Users, CheckCircle, Radio } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const OngoingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axiosInstance.get('/organizer/events');
        setEvents((res.data || []).filter(e => ['Published', 'Ongoing'].includes(e.status)));
      } catch (err) { console.error('Events fetch error:', err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = filter === 'All' ? events : events.filter(e => e.status === filter);
  const statusColor = { Published: 'border-accent-tertiary text-accent-tertiary', Ongoing: 'border-success text-success' };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mesh-bg p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">LIVE EVENTS</h1>
            <p className="font-mono text-[11px] text-text-muted mt-1">Currently published and ongoing events</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0 mb-6 border-b border-border">
          {['All', 'Published', 'Ongoing'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] px-4 py-3 border-b-2 transition-all ${
                filter === f ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}>{f}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Radio size={32} className="text-text-muted mx-auto mb-2" />
            <p className="font-mono text-[12px] text-text-muted">No {filter !== 'All' ? filter.toLowerCase() : 'live'} events</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {filtered.map(event => {
              const regCount = event.totalRegistrations || 0;
              const attendanceCount = event.attendanceCount || 0;
              const limit = event.registrationLimit || 0;
              const pct = limit > 0 ? Math.round((regCount / limit) * 100) : 0;
              return (
                <div key={event._id} className="bg-surface border border-border hover:border-accent-primary/30 transition-all">
                  <div className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-heading text-base text-text-primary truncate">{event.name}</h3>
                        <span className={`font-mono text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 border ${statusColor[event.status] || ''}`}>{event.status}</span>
                      </div>
                      <p className="font-mono text-[10px] text-text-muted">{new Date(event.startDate).toLocaleDateString()} • {event.venue || '-'}</p>
                      <div className="flex items-center gap-6 mt-2">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-text-secondary"><Users size={12} className="text-accent-tertiary" /> {regCount} registered</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-text-secondary"><CheckCircle size={12} className="text-success" /> {attendanceCount} attended</span>
                      </div>
                      {limit > 0 && (
                        <div className="mt-2 w-64">
                          <div className="flex justify-between font-mono text-[9px] text-text-muted mb-0.5">
                            <span>Registrations</span><span>{regCount}/{limit} ({pct}%)</span>
                          </div>
                          <div className="h-1 bg-border"><div className="h-1 bg-accent-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/organizer/event/${event._id}`} className="btn-brutal btn-ghost !text-[10px] !py-1.5 !px-3">Manage</Link>
                      <Link to={`/organizer/event/${event._id}`} state={{ openTab: 'attendance' }}
                        className="btn-brutal btn-primary !text-[10px] !py-1.5 !px-3 flex items-center gap-1"><QrCode size={12} /> QR Scanner</Link>
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

export default OngoingEvents;
