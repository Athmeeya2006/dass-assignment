import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { Users, Building2, Calendar, Ticket, ArrowRight, Activity } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          axiosInstance.get('/admin/dashboard-stats'),
          axiosInstance.get('/health'),
        ]);
        setStats(statsRes.data);
        setHealth(healthRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  const statCards = [
    { label: 'Participants', value: stats?.participantCount || 0, icon: Users, color: 'text-accent-tertiary' },
    { label: 'Clubs', value: stats?.organizerCount || 0, icon: Building2, color: 'text-accent-secondary' },
    { label: 'Events', value: stats?.eventCount || 0, icon: Calendar, color: 'text-accent-primary' },
    { label: 'Registrations', value: stats?.registrationCount || 0, icon: Ticket, color: 'text-success' },
  ];

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mesh-bg p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><div className="h-[2px] w-full bg-accent-primary animate-scanLine" /></div>
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-5xl tracking-wider text-text-primary">ADMIN CONSOLE</h1>
            <p className="font-mono text-[11px] text-text-muted mt-1">System overview & management</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface border border-border p-5 text-center hover:border-accent-primary/30 transition-all">
              <Icon size={20} className={`${color} mx-auto mb-2`} />
              <p className={`font-display text-3xl tracking-wider ${color}`}>{value}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link to="/admin/organizers" className="group bg-surface border border-border p-5 hover:border-accent-primary/30 transition-all flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base text-text-primary">Manage Organizers</h3>
              <p className="font-mono text-[11px] text-text-muted">Create, edit & manage club accounts</p>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:text-accent-primary transition-colors" />
          </Link>
          <Link to="/admin/password-resets" className="group bg-surface border border-border p-5 hover:border-accent-primary/30 transition-all flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base text-text-primary">Password Resets</h3>
              <p className="font-mono text-[11px] text-text-muted">Review & process reset requests</p>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:text-accent-primary transition-colors" />
          </Link>
        </div>

        {/* System Health */}
        <div className="bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-success" />
            <h3 className="font-heading text-base text-text-primary">System Health</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Database', health?.database || 'Unknown', health?.database === 'Connected' ? 'text-success' : 'text-error'],
              ['API Server', health?.api || 'Unknown', health?.api === 'Running' ? 'text-success' : 'text-error'],
              ['Status', health?.status || 'Unknown', health?.status === 'Operational' ? 'text-success' : 'text-warning'],
            ].map(([label, value, color]) => (
              <div key={label} className="bg-ink border border-border p-3 text-center">
                <div className={`w-2 h-2 rounded-full ${color === 'text-success' ? 'bg-success' : 'bg-error'} mx-auto mb-1`} />
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                <p className={`font-mono text-[11px] ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
