import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance, { BASE_URL } from '../../api/axios';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Users, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import { PageLoader } from '../../components/ui/Skeleton';

const TeamChat = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchTeam();
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated. Please log in again.'); setLoading(false); return; }

    const socket = io(BASE_URL, {
      auth: { token },
      reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      socket.emit('join-team', teamId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
      setConnected(false);
      if (err.message === 'Authentication required' || err.message === 'Invalid token') {
        setError('Authentication failed. Please log in again.');
      }
    });
    socket.on('team-error', (errMsg) => {
      console.error('Team socket error:', errMsg);
      setError(typeof errMsg === 'string' ? errMsg : 'Failed to connect to team chat.');
    });
    socket.on('team-chat-history', (history) => setMessages(history));
    socket.on('team-message-received', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('team-online-users', (userIds) => setOnlineUsers(userIds));
    socket.on('team-typing', (data) => {
      setTypingUsers((prev) => prev.find(u => u.senderId === data.senderId) ? prev : [...prev, data]);
      setTimeout(() => setTypingUsers((prev) => prev.filter(u => u.senderId !== data.senderId)), 3000);
    });
    socket.on('team-stop-typing', (data) => setTypingUsers((prev) => prev.filter(u => u.senderId !== data.senderId)));
    return () => { socket.emit('leave-team', teamId); socket.disconnect(); };
  }, [teamId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchTeam = async () => {
    try { const res = await axiosInstance.get(`/team/by-id/${teamId}`); setTeam(res.data.team); }
    catch (err) { setError('Could not load team details.'); } finally { setLoading(false); }
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || !socketRef.current) return;
    if (!connected) { setError('Not connected. Reconnecting...'); return; }
    socketRef.current.emit('team-message', {
      teamId, text: input.trim(),
      senderName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email,
    });
    setInput('');
    socketRef.current.emit('team-stop-typing', { teamId });
  }, [input, teamId, user, connected]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socketRef.current) return;
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email;
    socketRef.current.emit('team-typing', { teamId, senderName: name });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socketRef.current?.emit('team-stop-typing', { teamId }), 2000);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const isOnline = (memberId) => onlineUsers.includes(memberId?.toString());

  if (loading) return <PageLoader />;

  const allMembers = team ? [
    { id: team.leaderId?._id, name: `${team.leaderId?.firstName || ''} ${team.leaderId?.lastName || ''}`.trim(), isLeader: true },
    ...(team.members?.filter(m => m.status === 'Accepted').map(m => ({
      id: m.participantId?._id,
      name: `${m.participantId?.firstName || ''} ${m.participantId?.lastName || ''}`.trim(),
      isLeader: false,
    })) || [])
  ] : [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-ink">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 font-mono text-[10px] text-text-muted hover:text-accent-primary transition-colors uppercase tracking-wider mb-3">
            <ArrowLeft size={12} /> Back
          </button>
          <h2 className="font-display text-xl tracking-wider text-text-primary flex items-center gap-2">
            <Users size={16} className="text-accent-primary" /> TEAM CHAT
          </h2>
          {team && <p className="font-mono text-[11px] text-accent-primary mt-1">{team.teamName}</p>}
        </div>

        <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-3">Members ({allMembers.length})</p>
          {allMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-8 h-8 bg-ink border border-border text-text-secondary flex items-center justify-center font-mono text-[11px] font-bold">
                  {(member.name || '?')[0].toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-surface ${isOnline(member.id) ? 'bg-success' : 'bg-text-muted'}`} />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm text-text-primary truncate">
                  {member.name}
                  {member.id === user?._id && <span className="font-mono text-[9px] text-text-muted ml-1">(you)</span>}
                </p>
                {member.isLeader && <p className="font-mono text-[9px] text-accent-primary uppercase tracking-wider">Leader</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border font-mono text-[10px] text-text-muted flex items-center gap-1.5">
          {connected ? (
            <><Wifi size={10} className="text-success" /> Connected</>
          ) : (
            <><WifiOff size={10} className="text-error" /> Reconnecting...</>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="border-b border-error/30 bg-error/5 px-4 py-2">
            <p className="font-mono text-[12px] text-error">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <MessageSquare size={28} className="text-text-muted mx-auto mb-2" />
              <p className="font-heading text-base text-text-secondary">No messages yet</p>
              <p className="font-mono text-[11px] text-text-muted">Say hello to your team!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.senderId === user?._id;
            const showName = !isMe && (i === 0 || messages[i - 1]?.senderId !== msg.senderId);
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 ${
                  isMe
                    ? 'bg-accent-primary text-ink'
                    : 'bg-surface border border-border text-text-primary'
                }`}>
                  {showName && (
                    <p className="font-mono text-[10px] font-bold mb-1 text-accent-secondary">{msg.senderName}</p>
                  )}
                  <p className="font-mono text-[12px] whitespace-pre-wrap break-words">{msg.text || msg.content}</p>
                  <p className={`font-mono text-[9px] mt-1 text-right ${isMe ? 'text-ink/60' : 'text-text-muted'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-6 pb-1 font-mono text-[10px] text-text-muted italic animate-pulse">
            {typingUsers.map(u => u.senderName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4 flex gap-3">
          <input type="text" value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="input-brutal flex-1" />
          <button onClick={handleSend} disabled={!input.trim()}
            className="btn-brutal btn-primary !px-4 !py-2 disabled:opacity-30">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;
