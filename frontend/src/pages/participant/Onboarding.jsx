import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { Search, Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const INTEREST_OPTIONS = [
  'Technology', 'Music', 'Sports', 'Cultural', 'Gaming',
  'Art', 'Dance', 'Drama', 'Science', 'Literature',
  'Photography', 'Finance', 'Entrepreneurship', 'Robotics', 'AI/ML',
];

const Onboarding = () => {
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => { fetchOrganizers(); }, []);

  const fetchOrganizers = async () => {
    setOrgLoading(true);
    try {
      const res = await axiosInstance.get('/organizers');
      setOrganizers(res.data);
    } catch (err) { console.error('Organizers fetch error:', err); } finally { setOrgLoading(false); }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleOrganizer = (orgId) => {
    setSelectedOrganizers((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const handleSkip = () => navigate('/participant/dashboard');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/participant/onboarding', {
        interests: selectedInterests,
        followedOrganizers: selectedOrganizers,
      });
      navigate('/participant/dashboard');
    } catch (err) {
      navigate('/participant/dashboard');
    } finally { setLoading(false); }
  };

  const filteredOrganizers = organizers.filter((org) =>
    org.name?.toLowerCase().includes(search.toLowerCase()) ||
    org.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center py-8 px-4">
      <div className="bg-surface border border-border max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-accent-primary flex items-center justify-center">
              <Sparkles size={16} className="text-ink" />
            </div>
          </div>
          <h1 className="font-display text-4xl tracking-wider text-text-primary mb-2">WELCOME TO FELICITY</h1>
          <p className="font-mono text-[12px] text-text-muted">Let's personalise your experience</p>
          <div className="flex justify-center mt-4 gap-2">
            <div className={`h-1 w-16 ${step >= 1 ? 'bg-accent-primary' : 'bg-border'}`} />
            <div className={`h-1 w-16 ${step >= 2 ? 'bg-accent-primary' : 'bg-border'}`} />
          </div>
        </div>

        {step === 1 && (
          <>
            <h2 className="font-heading text-lg text-text-primary mb-2">Areas of Interest</h2>
            <p className="font-mono text-[12px] text-text-muted mb-6">Select topics you care about - we'll show relevant events first.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 font-mono text-[12px] uppercase tracking-wider border transition-all ${
                    selectedInterests.includes(interest)
                      ? 'bg-accent-primary text-ink border-accent-primary'
                      : 'bg-transparent text-text-secondary border-border hover:border-text-muted'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={handleSkip} className="font-mono text-[12px] text-text-muted hover:text-text-primary transition-colors">
                Skip for now
              </button>
              <button onClick={() => setStep(2)} className="btn-brutal btn-primary flex items-center gap-2">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-heading text-lg text-text-primary mb-2">Follow Clubs & Organizers</h2>
            <p className="font-mono text-[12px] text-text-muted mb-4">Follow clubs to see their events first in your feed.</p>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text" placeholder="Search clubs..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-brutal pl-6"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-8 scrollbar-hide">
              {orgLoading ? (
                <div className="flex justify-center py-8">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-accent-primary animate-pulse" />
                    <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : filteredOrganizers.length === 0 ? (
                <p className="font-mono text-[12px] text-text-muted text-center py-8">No organizers found</p>
              ) : (
                filteredOrganizers.map((org) => (
                  <div
                    key={org._id}
                    onClick={() => toggleOrganizer(org._id)}
                    className={`flex items-center justify-between p-3 border cursor-pointer transition-all ${
                      selectedOrganizers.includes(org._id)
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border hover:border-text-muted'
                    }`}
                  >
                    <div>
                      <p className="font-heading text-sm text-text-primary">{org.name}</p>
                      <p className="font-mono text-[11px] text-text-muted">{org.category}</p>
                    </div>
                    {selectedOrganizers.includes(org._id) && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-accent-primary uppercase tracking-wider">
                        <Check size={12} /> Following
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-brutal btn-ghost flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <div className="flex gap-3">
                <button onClick={handleSkip} className="btn-brutal btn-ghost">Skip</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-brutal btn-primary">
                  {loading ? 'Saving...' : 'Finish'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
