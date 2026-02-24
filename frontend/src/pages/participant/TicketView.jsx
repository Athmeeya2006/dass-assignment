import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

const TicketView = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const res = await axiosInstance.get(`/event/ticket/${ticketId}/details`);
      setTicket(res.data);
    } catch (err) {
      try {
        const res = await axiosInstance.get(`/participant/ticket/${ticketId}`);
        setTicket(res.data);
      } catch (e) { console.error('Ticket fetch error:', e); }
    } finally { setLoading(false); }
  };

  const handleDownloadICS = async () => {
    try {
      const res = await axiosInstance.get(`/event/ticket/${ticket.ticketId}/calendar`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `${ticket.eventName}.ics`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { toast.error('Failed to download calendar file'); }
  };

  const handleGoogleCalendar = async () => {
    try { const res = await axiosInstance.get(`/event/ticket/${ticket.ticketId}/google-calendar`); window.open(res.data.url, '_blank'); }
    catch (err) { toast.error('Failed to get Google Calendar link'); }
  };

  const handleOutlookCalendar = async () => {
    try { const res = await axiosInstance.get(`/event/ticket/${ticket.ticketId}/outlook-calendar`); window.open(res.data.url, '_blank'); }
    catch (err) { toast.error('Failed to get Outlook Calendar link'); }
  };

  if (loading) return <PageLoader />;

  if (!ticket) return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center">
      <p className="font-mono text-[14px] text-text-muted mb-3">Ticket not found.</p>
      <Link to="/participant/dashboard" className="font-mono text-[11px] text-accent-primary hover:underline uppercase tracking-wider">Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Ticket Card */}
        <div className="bg-surface border border-border overflow-hidden">
          {/* Header */}
          <div className="mesh-bg p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
            </div>
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">Event Ticket</p>
                <h1 className="font-display text-3xl md:text-4xl tracking-wider text-text-primary">{ticket.eventName?.toUpperCase()}</h1>
              </div>
              <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border ${
                ticket.attendanceMarked ? 'border-success text-success bg-success/10' : 'border-accent-primary text-accent-primary bg-accent-primary/10'
              }`}>
                {ticket.attendanceMarked ? '✓ Attended' : 'Not attended yet'}
              </span>
            </div>
          </div>

          {/* Torn edge effect */}
          <div className="torn-edge h-3 bg-surface" />

          {/* Body */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ['Participant', ticket.participantName],
                ['Email', ticket.participantEmail],
                ['Date', ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA'],
                ['Venue', ticket.eventVenue || 'TBA'],
                ...(ticket.attendanceMarked ? [['Attended At', new Date(ticket.attendanceTimestamp).toLocaleString()]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">{label}</p>
                  <p className="font-heading text-sm text-text-primary truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Ticket ID */}
            <div className="bg-ink border border-border p-4 mb-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-1">Ticket ID</p>
              <p className="font-mono text-[13px] text-accent-primary break-all select-all">{ticket.ticketId}</p>
            </div>

            {/* QR Code */}
            {ticket.qrCode && (
              <div className="flex flex-col items-center mb-6">
                <p className="font-mono text-[11px] text-text-muted mb-3 uppercase tracking-wider">Scan QR at entry</p>
                <div className="border-2 border-accent-primary p-2 bg-white">
                  <img src={ticket.qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {/* Calendar */}
            <div className="relative">
              <button onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                className="w-full btn-brutal btn-ghost flex items-center justify-center gap-2">
                <Calendar size={14} /> Add to Calendar
              </button>
              {showCalendarMenu && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-surface border border-border shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10">
                  {[
                    ['ICS', 'Download .ics file', () => { handleDownloadICS(); setShowCalendarMenu(false); }],
                    ['GCal', 'Google Calendar', () => { handleGoogleCalendar(); setShowCalendarMenu(false); }],
                    ['Outlook', 'Microsoft Outlook', () => { handleOutlookCalendar(); setShowCalendarMenu(false); }],
                  ].map(([icon, label, action]) => (
                    <button key={label} onClick={action}
                      className="w-full px-4 py-3 text-left hover:bg-ink flex items-center gap-3 font-mono text-[12px] text-text-secondary border-b border-border last:border-b-0 transition-colors">
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link to="/participant/dashboard"
            className="font-mono text-[11px] text-text-muted hover:text-accent-primary transition-colors uppercase tracking-wider">
            <ArrowLeft size={12} className="inline mr-1" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TicketView;
