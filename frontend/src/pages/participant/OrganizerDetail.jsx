import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Building2, Mail, CalendarDays, Clock, ArrowLeft, UserPlus, UserMinus, CheckCircle } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const OrganizerDetail = () => {
  const { organizerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, profileRes] = await Promise.all([
          axiosInstance.get(`/organizers/${organizerId}`),
          axiosInstance.get('/participant/profile'),
        ]);
        setData(orgRes.data);
        const followed = profileRes.data.followedOrganizers?.some(o => (o._id || o) === organizerId);
        setFollowing(followed);
      } catch (err) { console.error('Organizer detail fetch error:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [organizerId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await axiosInstance.delete(`/organizers/${organizerId}/follow`);
        setFollowing(false); toast.success('Unfollowed');
      } else {
        await axiosInstance.post(`/organizers/${organizerId}/follow`);
        setFollowing(true); toast.success('Following!');
      }
    } catch (err) { toast.error('Action failed'); } finally { setFollowLoading(false); }
  };

  if (loading) return <PageLoader />;

  if (!data) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="text-center">
        <Building2 size={40} className="mx-auto mb-3 text-text-muted opacity-30" />
        <p className="font-mono text-[13px] text-text-muted">Organizer not found</p>
        <Link to="/participant/clubs" className="font-mono text-[11px] text-accent-primary hover:underline mt-2 inline-block">← Back to Clubs</Link>
      </div>
    </div>
  );

  const { organizer, upcomingEvents = [], pastEvents = [] } = data;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/participant/clubs" className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-accent-primary transition-colors uppercase tracking-wider mb-6">
          <ArrowLeft size={12} /> Back to Clubs
        </Link>

        {/* Organizer Card */}
        <div className="bg-surface border border-border overflow-hidden mb-6">
          <div className="mesh-bg p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-[2px] w-full bg-accent-secondary animate-scanLine" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-accent-primary text-ink flex items-center justify-center font-display text-3xl tracking-wider flex-shrink-0">
                  {organizer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">{organizer.name?.toUpperCase()}</h1>
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border border-accent-primary/50 text-accent-primary mt-1 inline-block">
                    {organizer.category}
                  </span>
                </div>
              </div>
              <button onClick={handleFollow} disabled={followLoading}
                className={`btn-brutal flex items-center gap-2 shrink-0 ${
                  following ? 'btn-ghost hover:!text-error hover:!border-error' : 'btn-primary'
                }`}>
                {following ? <UserMinus size={14} /> : <UserPlus size={14} />}
                {followLoading ? '...' : following ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {organizer.description && (
              <p className="font-mono text-[13px] text-text-secondary leading-relaxed mb-4">{organizer.description}</p>
            )}
            {organizer.contactEmail && (
              <div className="flex items-center gap-2 font-mono text-[12px] text-text-muted">
                <Mail size={12} />
                <a href={`mailto:${organizer.contactEmail}`} className="hover:text-accent-primary transition-colors">{organizer.contactEmail}</a>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={14} className="text-accent-primary" />
            <h2 className="font-heading text-base text-text-primary">Upcoming Events</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border border-accent-primary/30 text-accent-primary">{upcomingEvents.length}</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-10 bg-surface border border-border">
              <CalendarDays size={24} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="font-mono text-[12px] text-text-muted">No upcoming events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {upcomingEvents.map(event => (
                <Link key={event._id} to={`/participant/event/${event._id}`}
                  className="group bg-surface border border-border p-4 hover:border-accent-primary transition-all">
                  <h3 className="font-heading text-sm text-text-primary group-hover:text-accent-primary transition-colors">{event.name}</h3>
                  <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-text-muted">
                    <span className="flex items-center gap-1"><CalendarDays size={10} /> {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="text-success">{event.fee > 0 ? `₹${event.fee}` : 'Free'}</span>
                    <span className="px-1.5 py-0.5 border border-accent-tertiary/30 text-accent-tertiary">{event.type}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-text-muted" />
            <h2 className="font-heading text-base text-text-primary">Past Events</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border border-border text-text-muted">{pastEvents.length}</span>
          </div>
          {pastEvents.length === 0 ? (
            <div className="text-center py-10 bg-surface border border-border">
              <Clock size={24} className="mx-auto mb-2 text-text-muted opacity-30" />
              <p className="font-mono text-[12px] text-text-muted">No past events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pastEvents.map(event => (
                <Link key={event._id} to={`/participant/event/${event._id}`}
                  className="group bg-surface border border-border p-4 hover:border-text-muted transition-all opacity-70 hover:opacity-100">
                  <h3 className="font-heading text-sm text-text-secondary">{event.name}</h3>
                  <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-text-muted">
                    <span>{event.endDate ? new Date(event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                    <span className="px-1.5 py-0.5 border border-border">{event.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;
