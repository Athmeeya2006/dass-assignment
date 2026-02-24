import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, Zap, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 mesh-bg flex-col justify-between p-12 text-text-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-accent-primary flex items-center justify-center">
            <Zap size={20} className="text-ink" />
          </div>
          <span className="font-display text-3xl tracking-wider">FELICITY</span>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-6xl xl:text-7xl leading-[0.9] mb-6 tracking-wide">
            MANAGE<br />EVENTS.<br />
            <span className="text-accent-primary">CONNECT</span><br />
            CLUBS.
          </h1>
          <p className="font-mono text-[13px] text-text-secondary max-w-md leading-relaxed">
            The all-in-one platform for IIIT Hyderabad's flagship festival - 
            from registration to attendance, everything in one place.
          </p>
        </div>

        <div className="flex gap-10 relative z-10">
          {[['500+', 'Participants'], ['20+', 'Clubs'], ['50+', 'Events']].map(([num, label]) => (
            <div key={label}>
              <div className="stat-number text-4xl">{num}</div>
              <div className="stat-label mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-ink">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-accent-primary flex items-center justify-center">
              <Zap size={16} className="text-ink" />
            </div>
            <span className="font-display text-2xl tracking-wider text-text-primary">FELICITY</span>
          </div>

          <div className="mb-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-primary mb-2">Authentication</p>
            <h2 className="font-display text-4xl text-text-primary tracking-wide">WELCOME BACK</h2>
            <p className="font-mono text-[12px] text-text-muted mt-2">Sign in to your account to continue.</p>
          </div>

          {error && (
            <div className="border border-error/30 border-l-[3px] border-l-error bg-error/5 px-4 py-3 mb-6 animate-shake">
              <p className="font-mono text-[12px] text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-brutal"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-brutal pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-brutal btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Sign In
                  <ArrowRight size={14} />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="font-mono text-[12px] text-text-muted">
              No account?{' '}
              <Link to="/signup" className="text-accent-primary hover:underline font-semibold">
                Create one
              </Link>
            </span>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Login;
