import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, LayoutDashboard, Calendar, Users, User, LogOut,
  PlusCircle, Shield, Settings, Radio, Menu, X, Key, Search
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isParticipant, isOrganizer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const linkCls = (path) =>
    `flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-200 border-b-2 ${
      isActive(path)
        ? 'text-accent-primary border-accent-primary'
        : 'text-text-secondary border-transparent hover:text-text-primary hover:border-text-muted'
    }`;

  const mobileLinkCls = (path) =>
    `flex items-center gap-4 px-2 py-4 font-mono text-sm uppercase tracking-[0.15em] transition-all border-b border-border ${
      isActive(path)
        ? 'text-accent-primary'
        : 'text-text-secondary hover:text-text-primary'
    }`;

  const participantLinks = [
    { to: '/participant/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    { to: '/participant/browse', label: 'Browse', icon: <Search size={14} /> },
    { to: '/participant/clubs', label: 'Clubs', icon: <Users size={14} /> },
    { to: '/participant/profile', label: 'Profile', icon: <User size={14} /> },
  ];

  const organizerLinks = [
    { to: '/organizer/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    { to: '/organizer/create-event', label: 'Create', icon: <PlusCircle size={14} /> },
    { to: '/organizer/ongoing', label: 'Ongoing', icon: <Radio size={14} /> },
    { to: '/organizer/profile', label: 'Profile', icon: <Settings size={14} /> },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    { to: '/admin/organizers', label: 'Clubs', icon: <Shield size={14} /> },
    { to: '/admin/password-resets', label: 'Resets', icon: <Key size={14} /> },
  ];

  const navLinks = isParticipant ? participantLinks : isOrganizer ? organizerLinks : adminLinks;

  const roleLabel = isParticipant ? 'PARTICIPANT' : isOrganizer ? 'ORGANIZER' : 'ADMIN';
  const roleColor = isParticipant
    ? 'text-accent-tertiary border-accent-tertiary'
    : isOrganizer
    ? 'text-success border-success'
    : 'text-accent-secondary border-accent-secondary';

  return (
    <>
      <nav className="fixed top-0 w-full bg-ink/95 backdrop-blur-md border-b border-border z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-accent-primary flex items-center justify-center">
                <Zap size={14} className="text-ink" />
              </div>
              <span className="font-display text-xl tracking-wider text-text-primary group-hover:text-accent-primary transition-colors">
                FELICITY
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} className={linkCls(link.to)}>
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User + Logout */}
            <div className="hidden md:flex items-center gap-4">
              <span className={`font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 border ${roleColor}`}>
                {roleLabel}
              </span>
              {user && (
                <span className="font-mono text-[11px] text-text-muted max-w-28 truncate">
                  {user.firstName || user.name || user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted hover:text-error px-2 py-1.5 transition-colors uppercase tracking-wider"
              >
                <LogOut size={13} />
                Exit
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-text-secondary hover:text-accent-primary transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-ink/98 backdrop-blur-lg md:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
            <span className="font-display text-xl tracking-wider text-accent-primary">FELICITY</span>
            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 px-6 py-6 overflow-y-auto">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={mobileLinkCls(link.to)}
                onClick={() => setIsOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-3 mb-6">
                <span className={`font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 border ${roleColor}`}>
                  {roleLabel}
                </span>
                <span className="font-mono text-[12px] text-text-muted">
                  {user?.firstName || user?.name || user?.email}
                </span>
              </div>
              <button
                onClick={() => { handleLogout(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 font-mono text-sm uppercase tracking-[0.1em] text-error py-3 hover:text-error/80 transition-colors"
              >
                <LogOut size={16} />
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
