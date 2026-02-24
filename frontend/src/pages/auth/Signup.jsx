import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, UserPlus, Zap, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const IIIT_DOMAINS = ['@students.iiit.ac.in', '@iiit.ac.in', '@research.iiit.ac.in'];

const Signup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    participantType: 'Non-IIIT', collegeOrg: '', contactNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'email') {
      const isIIIT = IIIT_DOMAINS.some(d => value.endsWith(d));
      if (isIIIT) setFormData(prev => ({ ...prev, email: value, participantType: 'IIIT' }));
    }
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) return 'First and last name are required.';
    if (!formData.email) return 'Email is required.';
    if (formData.participantType === 'IIIT' && !IIIT_DOMAINS.some(d => formData.email.endsWith(d)))
      return 'IIIT participants must use @students.iiit.ac.in, @iiit.ac.in, or @research.iiit.ac.in email.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      await signup({ ...submitData });
      navigate('/participant/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 mesh-bg flex-col justify-between p-12 text-text-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="h-[2px] w-full bg-accent-secondary animate-scanLine" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-accent-primary flex items-center justify-center">
            <Zap size={20} className="text-ink" />
          </div>
          <span className="font-display text-3xl tracking-wider">FELICITY</span>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-5xl leading-[0.9] mb-4 tracking-wide">
            JOIN THE<br />
            <span className="text-accent-secondary">FEST</span><br />
            EXPERIENCE
          </h1>
          <p className="font-mono text-[13px] text-text-secondary max-w-xs leading-relaxed">
            Register as a participant and get access to all events, workshops, and activities.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="space-y-4 relative z-10">
          {['Account Setup', 'Profile Details'].map((label, i) => (
            <div key={i} className={`flex items-center gap-3 ${step === i + 1 ? 'text-text-primary' : step > i + 1 ? 'text-success' : 'text-text-muted'}`}>
              <div className={`w-7 h-7 flex items-center justify-center font-mono text-[11px] font-bold border-2 ${
                step === i + 1 ? 'bg-accent-primary text-ink border-accent-primary' 
                : step > i + 1 ? 'bg-success text-ink border-success' 
                : 'border-text-muted'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="font-mono text-[12px] uppercase tracking-[0.1em]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-ink px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-accent-primary flex items-center justify-center">
              <Zap size={16} className="text-ink" />
            </div>
            <span className="font-display text-2xl tracking-wider text-text-primary">FELICITY</span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-1 border border-accent-primary text-accent-primary">
                Step {step} of 2
              </span>
            </div>
            <h2 className="font-display text-3xl text-text-primary tracking-wide">
              {step === 1 ? 'CREATE ACCOUNT' : 'ALMOST THERE'}
            </h2>
            <p className="font-mono text-[12px] text-text-muted mt-2">
              {step === 1 ? 'Enter your basic information to get started.' : 'Complete your profile details.'}
            </p>
          </div>

          {error && (
            <div className="border border-error/30 border-l-[3px] border-l-error bg-error/5 px-4 py-3 mb-5 animate-shake">
              <p className="font-mono text-[12px] text-error">{error}</p>
            </div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className="space-y-5">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="input-brutal" required />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="input-brutal" required />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Participant Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['IIIT', 'Non-IIIT'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, participantType: type }))}
                        className={`py-3 border-2 font-mono text-[12px] uppercase tracking-wider transition-all ${
                          formData.participantType === type
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-border text-text-muted hover:border-text-muted'
                        }`}
                      >
                        {type === 'IIIT' ? '// IIIT' : '// Non-IIIT'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Email Address</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder={formData.participantType === 'IIIT' ? 'name@students.iiit.ac.in' : 'you@example.com'}
                    className="input-brutal" required
                  />
                  {formData.participantType === 'IIIT' && (
                    <p className="font-mono text-[10px] text-accent-primary mt-1">Must use @students.iiit.ac.in, @iiit.ac.in, or @research.iiit.ac.in</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                      onChange={handleChange} placeholder="Min. 6 characters" className="input-brutal pr-10" required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Confirm Password</label>
                  <input
                    type="password" name="confirmPassword" value={formData.confirmPassword}
                    onChange={handleChange} placeholder="Repeat your password" className="input-brutal" required
                  />
                </div>

                <button type="submit" className="w-full btn-brutal btn-primary flex items-center justify-center gap-2">
                  Next <ChevronRight size={16} />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">
                    {formData.participantType === 'IIIT' ? 'College / Branch (optional)' : 'Organization / College'}
                  </label>
                  <input type="text" name="collegeOrg" value={formData.collegeOrg} onChange={handleChange} placeholder="e.g. IIIT Hyderabad / BITS Pilani" className="input-brutal" />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Contact Number (optional)</label>
                  <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="+91 98765 43210" className="input-brutal" />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button" onClick={() => { setStep(1); setError(''); }}
                    className="btn-brutal btn-ghost flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    type="submit" disabled={loading}
                    className="flex-1 btn-brutal btn-primary flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><UserPlus size={16} /> Create Account</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-8 text-center">
            <span className="font-mono text-[12px] text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-primary hover:underline font-semibold">Sign in</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
