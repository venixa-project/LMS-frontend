import React, { useState, useEffect } from 'react';
import { LiveSession } from '../../../types';
import { useAuthStore } from '../../../lib/store';
import { useLiveSessionStore } from '../../../lib/liveSessionStore';
import {
  Mic, MicOff, Video, VideoOff, Share2, MessageSquare,
  Users, PhoneOff, Settings, ShieldCheck, Radio, AlertCircle,
  Sparkles, Send, Hand, Maximize2, HelpCircle
} from 'lucide-react';

interface Props {
  session: LiveSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionEnded?: () => void;
}

export const LiveClassroomDemoModal: React.FC<Props> = ({
  session,
  isOpen,
  onClose,
  onSessionEnded,
}) => {
  const { user } = useAuthStore();
  const { endSession } = useLiveSessionStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin';
  const isHost = isTrainer || isAdmin;

  // Media Controls State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Live Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(480); // Start at 8m 00s for realistic feel

  // In-Room Chat State
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string; isHost?: boolean }[]>([
    { id: '1', sender: session?.instructorName || 'Dr. James Wilson', text: 'Welcome everyone! We will begin code walk-throughs in 2 minutes.', time: '13:00', isHost: true },
    { id: '2', sender: 'Alex Thompson', text: 'Audio and screen are crystal clear, Dr. Wilson!', time: '13:02' },
    { id: '3', sender: 'Maria Garcia', text: 'Ready with the cloned GitHub repo.', time: '13:04' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Participants in Room
  const [participants] = useState<{ id: string; name: string; role: string; mic: boolean; hand?: boolean }[]>([
    { id: 'u-host', name: session?.instructorName || 'Dr. James Wilson', role: 'Host / Trainer', mic: true },
    { id: 'u-007', name: 'Alex Thompson (You)', role: 'Student', mic: true },
    { id: 'u-009', name: 'Maria Garcia', role: 'Student', mic: false },
    { id: 'u-010', name: 'David Kim', role: 'Student', mic: false },
    { id: 'u-011', name: 'Sophia Patel', role: 'Student', mic: false },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: `msg-${Date.now()}`,
      sender: user?.displayName || 'Alex Thompson',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHost,
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewMessage('');
  };

  const handleEndClassroom = () => {
    if (session && isHost) {
      if (confirm('Are you sure you want to conclude and record this live session for all students?')) {
        endSession(session.id);
        onSessionEnded?.();
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !session) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 60,
        padding: 0,
        background: '#090d16',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Banner Notice */}
      <div
        style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)',
          borderBottom: '1px solid #312e81',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#c7d2fe',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} color="#818cf8" />
          <span>
            <strong>Interactive Live Classroom Demo:</strong> Real-time WebRTC audio/video stream simulation with interactive chat and telemetry.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-active font-mono" style={{ fontSize: '0.7rem' }}>
            Broadcasting 1080p @ 60 FPS
          </span>
          <span style={{ color: '#94a3b8' }}>Session ID: {session.id}</span>
        </div>
      </div>

      {/* Main Classroom Header Bar */}
      <div
        style={{
          padding: '12px 20px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'pulse 1.5s infinite',
              }}
            />
            LIVE NOW
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              {session.title}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '10px' }}>
              <span>Faculty: {session.instructorName || 'Dr. James Wilson'}</span>
              <span>&bull;</span>
              <span>Provider: {session.provider}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Timer Pill */}
          <div
            style={{
              background: '#1e293b',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#38bdf8',
              border: '1px solid #334155',
            }}
          >
            Elapsed: {formatTimer(elapsedSeconds)}
          </div>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleEndClassroom}
            style={{ gap: '6px', fontWeight: 700 }}
          >
            <PhoneOff size={15} />
            {isHost ? 'End Broadcast' : 'Leave Room'}
          </button>
        </div>
      </div>

      {/* Main Classroom Grid */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Video Stage Area */}
        <div
          style={{
            flex: 1,
            background: '#020617',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Primary Speaker Stage / Screen Share Stage */}
          <div
            style={{
              flex: 1,
              background: '#090d16',
              borderRadius: '12px',
              border: '1px solid #1e293b',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isScreenSharing ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💻</div>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {session.instructorName || 'Dr. James Wilson'} is sharing their screen
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  IDE Code Walkthrough: src/optimistic/mutations.tsx (Line 42–98)
                </div>
              </div>
            ) : isVideoOn ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 0 35px rgba(59, 130, 246, 0.45)',
                    border: '4px solid #1e293b',
                  }}
                >
                  JW
                </div>
                <div style={{ marginTop: '14px', fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {session.instructorName || 'Dr. James Wilson'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                  Lead Faculty &bull; Active Speaker
                </div>

                {/* Animated Voice Indicator */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: '#f8fafc',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  <span>Microphone: Broadcasting (Noise cancelled)</span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center' }}>
                <VideoOff size={48} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                <div>Camera is currently muted by speaker</div>
              </div>
            )}
          </div>

          {/* Bottom Participant Video Thumbnails Strip */}
          <div style={{ height: '95px', display: 'flex', gap: '10px', overflowX: 'auto' }}>
            {participants.map((p) => (
              <div
                key={p.id}
                style={{
                  width: '140px',
                  height: '100%',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e2e8f0',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: p.role.includes('Host') ? '#3b82f6' : '#64748b',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '4px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{p.role}</div>

                <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                  {p.mic ? (
                    <Mic size={11} color="#22c55e" />
                  ) : (
                    <MicOff size={11} color="#ef4444" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Classroom Controls Bar */}
          <div
            style={{
              height: '56px',
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '0 16px',
            }}
          >
            {/* Mic Toggle */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className="btn btn-sm"
              style={{
                background: isMicOn ? '#1e293b' : '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic size={17} /> : <MicOff size={17} />}
              <span style={{ fontSize: '0.75rem' }}>{isMicOn ? 'Mute' : 'Unmuted'}</span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="btn btn-sm"
              style={{
                background: isVideoOn ? '#1e293b' : '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoOn ? <Video size={17} /> : <VideoOff size={17} />}
              <span style={{ fontSize: '0.75rem' }}>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>

            {/* Screen Share */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className="btn btn-sm"
              style={{
                background: isScreenSharing ? '#3b82f6' : '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              title="Share Screen"
            >
              <Share2 size={17} />
              <span style={{ fontSize: '0.75rem' }}>Share</span>
            </button>

            {/* Raise Hand */}
            <button
              onClick={() => setIsHandRaised(!isHandRaised)}
              className="btn btn-sm"
              style={{
                background: isHandRaised ? '#eab308' : '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              title="Raise Hand"
            >
              <Hand size={17} />
              <span style={{ fontSize: '0.75rem' }}>{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            <div style={{ width: '1px', height: '24px', background: '#334155', margin: '0 6px' }} />

            {/* Chat Toggle */}
            <button
              onClick={() => setActiveTab('chat')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'chat' ? '#334155' : '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <MessageSquare size={17} />
              <span style={{ fontSize: '0.75rem' }}>Chat ({chatMessages.length})</span>
            </button>

            {/* Participants Toggle */}
            <button
              onClick={() => setActiveTab('participants')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'participants' ? '#334155' : '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <Users size={17} />
              <span style={{ fontSize: '0.75rem' }}>Scholars ({participants.length})</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar: Chat & Participants Panel */}
        <div
          style={{
            width: '320px',
            background: '#0f172a',
            borderLeft: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #1e293b',
              background: '#0b1120',
            }}
          >
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'chat' ? '#0f172a' : 'transparent',
                color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : '2px solid transparent',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              In-Room Chat
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'participants' ? '#0f172a' : 'transparent',
                color: activeTab === 'participants' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderBottom: activeTab === 'participants' ? '2px solid #38bdf8' : '2px solid transparent',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Participants ({participants.length})
            </button>
          </div>

          {/* Tab Body */}
          {activeTab === 'chat' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Message List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      background: msg.isHost ? 'rgba(59, 130, 246, 0.12)' : '#1e293b',
                      border: msg.isHost ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: msg.isHost ? '#38bdf8' : '#f8fafc' }}>
                        {msg.sender} {msg.isHost && '(Host)'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{msg.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#e2e8f0', wordBreak: 'break-word' }}>
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '12px',
                  borderTop: '1px solid #1e293b',
                  background: '#0b1120',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  placeholder="Ask a question or comment..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ padding: '0 12px', borderRadius: '6px' }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          ) : (
            /* Participants List */
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Active in Session
              </div>
              {participants.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#1e293b',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: p.role.includes('Host') ? '#3b82f6' : '#64748b',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{p.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.mic ? <Mic size={13} color="#22c55e" /> : <MicOff size={13} color="#ef4444" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
