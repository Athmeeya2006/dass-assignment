import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Search, Users, Building2, Heart } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const CATEGORY_COLORS = {
  Technical: 'border-accent-tertiary text-accent-tertiary',
  Cultural: 'border-accent-secondary text-accent-secondary',
  Sports: 'border-success text-success',
  Academic: 'border-accent-primary text-accent-primary',
  Literary: 'border-[#60A5FA] text-[#60A5FA]',
  Social: 'border-[#A855F7] text-[#A855F7]',
  Other: 'border-text-muted text-text-muted',
};

const Clubs = () => {
  const toast = useToast();
  const [organizers, setOrganizers] = useState([]);
  const [followed, setFollowed] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Literary', 'Academic', 'Social', 'Other'];

  useEffect(() => { fetchOrganizers(); fetchFollowed(); }, []);

  const fetchOrganizers = async () => {
    try { const res = await axiosInstance.get('/organizers'); setOrganizers(res.data); }
    catch (err) { console.error('Organizers fetch error:', err); } finally { setLoading(false); }
  };

  const fetchFollowed = async () => {
    try {
      const res = await axiosInstance.get('/participant/profile');
      setFollowed(res.data?.followedOrganizers?.map((o) => o._id || o) || []);
    } catch (e) { console.error('Followed fetch error:', e); }
  };

  const handleFollow = async (orgId) => {
    try { await axiosInstance.post(`/organizers/${orgId}/follow`); setFollowed(p => [...p, orgId]); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleUnfollow = async (orgId) => {
    try { await axiosInstance.delete(`/organizers/${orgId}/follow`); setFollowed(p => p.filter(id => id !== orgId)); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const filtered = organizers.filter(org => {
    const matchSearch = !search || org.name?.toLowerCase().includes(search.toLowerCase()) || org.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || org.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-text-primary">CLUBS & ORGANIZERS</h1>
          <p className="font-mono text-[12px] text-text-muted mt-2">Follow clubs to get their events first in your feed.</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
              <Building2 size={12} /> {organizers.length} clubs
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-accent-primary">
              <Heart size={12} /> {followed.length} following
            </span>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Search clubs or categories…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-brutal w-full !pl-6" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`font-mono text-[10px] uppercase tracking-[0.1em] px-3 py-2 border whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-accent-primary text-ink border-accent-primary'
                    : 'border-border text-text-muted hover:text-text-secondary hover:border-text-muted'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto mb-3 text-text-muted opacity-30" />
            <p className="font-mono text-[13px] text-text-muted">No clubs found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filtered.map((org) => {
              const isFollowing = followed.includes(org._id);
              const catCls = CATEGORY_COLORS[org.category] || CATEGORY_COLORS.Other;
              return (
                <div key={org._id} className="bg-surface border border-border p-5 flex flex-col card-hover">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-accent-primary text-ink flex items-center justify-center font-display text-xl tracking-wider flex-shrink-0">
                      {org.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-base text-text-primary truncate">{org.name}</h3>
                      <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border ${catCls}`}>
                        {org.category || 'Other'}
                      </span>
                    </div>
                  </div>
                  {org.description && (
                    <p className="font-mono text-[11px] text-text-secondary mb-4 line-clamp-2 flex-1">{org.description}</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <Link to={`/participant/organizer/${org._id}`}
                      className="flex-1 text-center font-mono text-[10px] uppercase tracking-wider border border-border text-text-secondary py-2 hover:text-accent-primary hover:border-accent-primary transition-colors">
                      View Profile
                    </Link>
                    <button onClick={() => isFollowing ? handleUnfollow(org._id) : handleFollow(org._id)}
                      className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2 flex items-center justify-center gap-1 transition-all ${
                        isFollowing
                          ? 'border border-border text-text-muted hover:text-error hover:border-error'
                          : 'bg-accent-primary text-ink hover:shadow-[0_0_20px_rgba(232,255,0,0.3)]'
                      }`}>
                      <Heart size={10} className={isFollowing ? 'fill-current' : ''} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
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

export default Clubs;
