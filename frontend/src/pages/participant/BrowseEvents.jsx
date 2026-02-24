import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { Search, Filter, Flame, CalendarDays, Users, X, Heart, ArrowRight } from 'lucide-react';

const EventCard = ({ event }) => (
  <Link
    to={`/participant/event/${event._id}`}
    className="group bg-surface border border-border hover:border-accent-primary/50 transition-all flex flex-col overflow-hidden"
  >
    <div className={`h-[3px] ${event.type === 'Merchandise' ? 'bg-accent-secondary' : 'bg-accent-primary'}`} />
    <div className="p-5 flex-1 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border-l-[3px] ${
              event.type === 'Merchandise' ? 'border-accent-secondary text-accent-secondary' : 'border-accent-tertiary text-accent-tertiary'
            } bg-surface`}>{event.type}</span>
            <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border-l-[3px] ${
              event.status === 'Ongoing' ? 'border-accent-primary text-accent-primary' : 'border-success text-success'
            } bg-surface`}>{event.status}</span>
          </div>
          <h3 className="font-heading text-base text-text-primary group-hover:text-accent-primary transition-colors leading-tight">{event.name}</h3>
          <p className="font-mono text-[11px] text-accent-primary mt-1">{event.organizerId?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted flex-wrap">
        <span className="flex items-center gap-1"><CalendarDays size={10} />
          {event.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
        {event.eligibility && <span className="flex items-center gap-1"><Users size={10} />{event.eligibility}</span>}
      </div>

      {event.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.tags.slice(0, 3).map(tag => (
            <span key={tag} className="font-mono text-[9px] text-text-muted px-1.5 py-0.5 border border-border">#{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
        <span className={`font-mono text-[13px] font-bold ${event.fee > 0 ? 'text-text-primary' : 'text-success'}`}>
          {event.fee > 0 ? `₹${event.fee}` : 'FREE'}
        </span>
        <span className="font-mono text-[10px] text-accent-primary uppercase tracking-wider group-hover:underline flex items-center gap-1">
          Details <ArrowRight size={10} />
        </span>
      </div>
    </div>
  </Link>
);

const TrendingCard = ({ event }) => (
  <Link
    to={`/participant/event/${event._id}`}
    className="min-w-[200px] sm:min-w-[220px] bg-surface border border-border hover:border-accent-primary transition-all shrink-0 flex flex-col p-4 group"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30">{event.type}</span>
      <Flame size={12} className="text-accent-secondary" />
    </div>
    <h4 className="font-heading text-sm text-text-primary group-hover:text-accent-primary transition-colors leading-tight mb-2">{event.name}</h4>
    <p className="font-mono text-[10px] text-text-muted mb-1">{event.organizerId?.name}</p>
    <div className="font-mono text-[10px] text-text-muted mb-2">{event.startDate ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</div>
    <span className={`font-mono text-[12px] font-bold ${event.fee > 0 ? 'text-accent-primary' : 'text-success'}`}>
      {event.fee > 0 ? `₹${event.fee}` : 'FREE'}
    </span>
  </Link>
);

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: '', eligibility: '', dateFrom: '', dateTo: '', followedOnly: false });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: search || undefined,
        type: filters.type || undefined,
        eligibility: filters.eligibility || undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        followedOnly: filters.followedOnly ? 'true' : undefined,
      };
      const res = await axiosInstance.get('/event/published', { params });
      setEvents(res.data || []);
    } catch (e) { setError('Failed to load events. Please try again.'); }
    finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => {
    axiosInstance.get('/event/trending').then(r => setTrending(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const hasFilters = filters.type || filters.eligibility || filters.dateFrom || filters.dateTo || filters.followedOnly;

  const clearFilters = () => {
    setSearch('');
    setFilters({ type: '', eligibility: '', dateFrom: '', dateTo: '', followedOnly: false });
  };

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Trending Carousel */}
        {trending.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-accent-secondary" />
              <h2 className="font-heading text-base text-text-primary">Trending Now</h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border border-accent-secondary/30 text-accent-secondary">
                Top 5 · 24h
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trending.map(event => <TrendingCard key={event._id} event={event} />)}
            </div>
          </div>
        )}

        {/* Browse header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl tracking-wider text-text-primary">BROWSE EVENTS</h1>
            <p className="font-mono text-[12px] text-text-muted mt-1">{events.length} event{events.length !== 1 ? 's' : ''} available</p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearFilters} className="btn-brutal btn-ghost flex items-center gap-1 !py-1.5 !px-3 !text-[10px]">
                <X size={12} /> Clear
              </button>
            )}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn-brutal flex items-center gap-1 !py-1.5 !px-3 !text-[10px] ${showFilters ? 'btn-primary' : 'btn-ghost'}`}>
              <Filter size={12} /> Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-surface border border-border p-5 mb-6 animate-slide-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">Search</label>
                <div className="relative">
                  <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Event name..." className="input-brutal pl-5 !text-[12px]" />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">Type</label>
                <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none">
                  <option value="">All Types</option>
                  <option value="Normal">Normal</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">Eligibility</label>
                <select value={filters.eligibility} onChange={(e) => setFilters(f => ({ ...f, eligibility: e.target.value }))}
                  className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none">
                  <option value="">All</option>
                  <option value="IIIT">IIIT Only</option>
                  <option value="All">All Participants</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.followedOnly}
                    onChange={(e) => setFilters(f => ({ ...f, followedOnly: e.target.checked }))}
                    className="w-4 h-4 accent-[#E8FF00]" />
                  <span className="font-mono text-[11px] text-text-secondary flex items-center gap-1">
                    <Heart size={11} /> Followed only
                  </span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">From</label>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary" />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">To</label>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-error/30 border-l-[3px] border-l-error bg-error/5 px-4 py-3 mb-6">
            <span className="font-mono text-[12px] text-error">{error}</span>
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="skeleton bg-surface border border-border p-6 h-52">
                <div className="h-4 bg-border/50 w-3/4 mb-4" />
                <div className="h-3 bg-border/50 w-1/2 mb-3" />
                <div className="h-3 bg-border/50 w-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={48} className="text-text-muted/30 mb-4" strokeWidth={1} />
            <h3 className="font-heading text-lg text-text-secondary mb-1">No events found</h3>
            <p className="font-mono text-[12px] text-text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {events.map(event => <EventCard key={event._id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseEvents;
