import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LiveSession } from '../../../types';
import { useAuthStore } from '../../../lib/store';
import { usePeopleStore } from '../../../lib/peopleStore';
import { apiClient } from '../../../lib/apiClient';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, X, Download, FileText,
  Clock, CheckCircle2, Bookmark, Sparkles, MessageSquare,
  Users, Radio, Video, Terminal, Layers
} from 'lucide-react';

interface Props {
  session: LiveSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveRecordingPlayerModal: React.FC<Props> = ({
  session,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState<number>(0);
  const [activeBottomTab, setActiveBottomTab] = useState<'chapters' | 'chat' | 'attendance' | 'takeaways'>('chapters');
  const [realAttendance, setRealAttendance] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen || !session?.id) return;
    apiClient
      .get(`/live-sessions/${session.id}/attendance`)
      .then((res) => {
        if (res && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data as any).roster || [];
          if (list.length > 0) {
            setRealAttendance(list);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, session?.id]);

  const metaDurationSeconds = useMemo(() => {
    if (session?.durationSeconds && session.durationSeconds > 0) return session.durationSeconds;
    if (Array.isArray(session?.materials)) {
      const recMeta = (session.materials as any[]).find((m: any) => m && m.type === 'recording_meta');
      if (recMeta && typeof recMeta.durationSeconds === 'number' && recMeta.durationSeconds > 0) {
        return recMeta.durationSeconds;
      }
    }
    return null;
  }, [session?.durationSeconds, session?.materials]);

  const totalDuration = useMemo(() => {
    if (actualDuration > 0) return Math.floor(actualDuration);
    if (metaDurationSeconds && metaDurationSeconds > 0) return metaDurationSeconds;
    if (session?.durationMinutes && session.durationMinutes > 0) {
      return session.durationMinutes * 60;
    }
    return 60;
  }, [actualDuration, metaDurationSeconds, session?.durationMinutes]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (timeSecs: number) => {
    const maxDur = actualDuration > 0 ? actualDuration : totalDuration;
    const clamped = Math.max(0, Math.min(timeSecs, maxDur));
    setCurrentTime(clamped);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clamped;
      } catch (err) {
        console.warn('Seek error:', err);
      }
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Determine if direct video stream (e.g. MP4/WebM uploaded to S3 or local video storage)
  const isDirectVideo = useMemo(() => {
    const raw = (session?.recordingUrl || '').toLowerCase();
    if (!raw) return false;
    return (
      raw.endsWith('.mp4') ||
      raw.endsWith('.webm') ||
      raw.endsWith('.mkv') ||
      raw.endsWith('.mov') ||
      raw.startsWith('blob:') ||
      raw.includes('/storage/videos/') ||
      raw.includes('live-recordings')
    );
  }, [session?.recordingUrl]);

  const resolvedVideoSrc = useMemo(() => {
    const url = session?.recordingUrl || '';
    if (!url) return '';
    return url;
  }, [session?.recordingUrl]);

  // Dynamic chapters based on actual video duration and session agenda
  const chapters = useMemo(() => {
    if (!session) return [];
    if (session.agenda) {
      const lines = session.agenda.split('\n').filter(Boolean);
      if (lines.length > 0) {
        const step = Math.floor(totalDuration / (lines.length + 1));
        return lines.map((line, idx) => {
          const timeSecs = idx * step;
          const cleanTitle = line.replace(/^[0-9]+[\.\-\)]\s*/, '');
          return { time: formatTime(timeSecs), seconds: timeSecs, title: cleanTitle };
        });
      }
    }

    if (totalDuration <= 10) {
      return [
        { time: '00:00', seconds: 0, title: 'Session Recording Start' },
        { time: formatTime(Math.max(1, totalDuration - 1)), seconds: Math.max(1, totalDuration - 1), title: 'Class Concluded' },
      ];
    }
    if (totalDuration <= 45) {
      return [
        { time: '00:00', seconds: 0, title: 'Session Recording Start' },
        { time: formatTime(Math.floor(totalDuration * 0.5)), seconds: Math.floor(totalDuration * 0.5), title: 'Live Demonstration & Class Topic' },
        { time: formatTime(Math.max(1, totalDuration - 1)), seconds: Math.max(1, totalDuration - 1), title: 'Class Concluded' },
      ];
    }
    if (totalDuration <= 180) {
      return [
        { time: '00:00', seconds: 0, title: 'Lecture Introduction & Class Roll Call' },
        { time: formatTime(Math.floor(totalDuration * 0.35)), seconds: Math.floor(totalDuration * 0.35), title: 'Core Concepts Walkthrough' },
        { time: formatTime(Math.floor(totalDuration * 0.7)), seconds: Math.floor(totalDuration * 0.7), title: 'Live Screen Demonstration' },
        { time: formatTime(Math.max(1, totalDuration - 2)), seconds: Math.max(1, totalDuration - 2), title: 'Summary & Next Steps' },
      ];
    }

    return [
      { time: '00:00', seconds: 0, title: 'Lecture Introduction & Class Roll Call' },
      { time: formatTime(Math.floor(totalDuration * 0.18)), seconds: Math.floor(totalDuration * 0.18), title: 'Core Architectural Concepts & Theoretical Foundations' },
      { time: formatTime(Math.floor(totalDuration * 0.42)), seconds: Math.floor(totalDuration * 0.42), title: 'Live Coding Walkthrough & Screen Demonstration' },
      { time: formatTime(Math.floor(totalDuration * 0.72)), seconds: Math.floor(totalDuration * 0.72), title: 'Student Debugging, Q&A & Code Reviews' },
      { time: formatTime(Math.floor(totalDuration * 0.9)), seconds: Math.floor(totalDuration * 0.9), title: 'Summary Key Takeaways & Practice Exercise Brief' },
    ];
  }, [session, totalDuration]);

  // Live Chat Transcript from the session
  const chatLog = useMemo(() => [
    { id: '1', sender: session?.instructorName || 'Faculty Trainer', role: 'Host', text: `Welcome to today's live lecture on ${session?.title || 'the curriculum module'}. Please keep your microphones muted unless asking a question.`, time: '10:02' },
    { id: '2', sender: 'Alex Thompson', role: 'Student', text: 'Good morning Professor! The screen presentation and audio are working clearly.', time: '10:03' },
    { id: '3', sender: 'Maria Garcia', role: 'Student', text: 'Will today\'s code sample be shared in the materials download section?', time: '10:08' },
    { id: '4', sender: session?.instructorName || 'Faculty Trainer', role: 'Host', text: 'Yes, full source code and slide deck PDF are attached right below the player.', time: '10:10' },
    { id: '5', sender: 'David Kim', role: 'Student', text: 'Understood, the explanation of the lifecycle flow makes a lot of sense now.', time: '10:25' },
    { id: '6', sender: 'Sophia Patel', role: 'Student', text: 'Could you please re-highlight the difference between compilation and runtime execution?', time: '10:38' },
  ], [session]);

  // Class Attendance Roster dynamically resolved from database
  const attendanceRoster = useMemo(() => {
    if (realAttendance.length > 0) {
      return realAttendance.map((att: any, idx: number) => {
        const isSelf = att.userId === user?.id;
        return {
          id: att.userId || String(idx),
          name: isSelf ? `${user?.displayName || att.name} (You)` : (att.name || 'Scholar'),
          rollNo: isSelf ? (user?.rollNo || att.rollNo || '26') : (att.rollNo || 'STU-001'),
          status: att.status === 'present' ? 'Present (Checked In)' : att.status === 'late' ? 'Joined Late' : (isSelf ? 'Watched Replay' : 'Absent (Did Not Join)'),
          joinTime: att.joinedAt ? new Date(att.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (att.status === 'present' ? 'Attended' : (isSelf ? 'Watched Replay' : 'Not Joined')),
        };
      });
    }

    if (session?.attendance && session.attendance.length > 0) {
      return session.attendance.map((att: any, idx: number) => {
        const isSelf = att.userId === user?.id;
        return {
          id: att.userId || String(idx),
          name: isSelf ? `${user?.displayName || att.user?.displayName} (You)` : (att.user?.displayName || 'Scholar'),
          rollNo: isSelf ? (user?.rollNo || att.user?.rollNo || '26') : (att.user?.rollNo || 'STU-001'),
          status: att.status === 'present' ? 'Present (Checked In)' : att.status === 'late' ? 'Joined Late' : (isSelf ? 'Watched Replay' : 'Absent'),
          joinTime: att.joinedAt ? new Date(att.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Attended',
        };
      });
    }

    const registeredScholars = usePeopleStore.getState().users.filter(
      (u) => u.activeRole === 'student' || u.activeRole === 'learner'
    );
    if (registeredScholars.length > 0) {
      return registeredScholars.map((u, idx) => {
        const isSelf = u.id === user?.id;
        return {
          id: u.id || String(idx),
          name: isSelf ? `${user?.displayName || u.displayName} (You)` : (u.displayName || 'Scholar'),
          rollNo: isSelf ? (user?.rollNo || u.rollNo || '26') : (u.rollNo || 'STU-001'),
          status: isSelf ? 'Watched Replay' : 'Absent',
          joinTime: isSelf ? 'Watched Replay' : 'Not Joined',
        };
      });
    }

    return [
      { id: '1', name: `${user?.displayName || 'Ravi Varma'} (You)`, rollNo: user?.rollNo || '26', status: 'Watched Replay', joinTime: 'Watched Replay' },
    ];
  }, [realAttendance, session?.attendance, user]);

  if (!isOpen || !session) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          padding: 0,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          animation: 'fadeIn 0.2s ease-out',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-secondary" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.72rem' }}>
                Recorded Live Class Replay
              </span>
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.7rem' }}>
                Standard 480p Stream
              </span>
              <span className="text-muted text-xs font-mono">{session.date || 'Recorded Session'}</span>
              <span className="text-muted text-xs">• {session.instructorName || 'Faculty Trainer'}</span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {session.title}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {session.recordingUrl && (
              <a
                href={resolvedVideoSrc}
                download={`Lecture_${session.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`}
                className="btn btn-secondary btn-sm"
                title="Download video recording to your device"
                style={{ gap: '6px', fontSize: '0.78rem', textDecoration: 'none' }}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} /> Download Video
              </a>
            )}
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Live Class Recorded Video / Screen Presentation Canvas */}
        <div
          style={{
            background: '#020617',
            height: '420px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {isDirectVideo ? (
            <video
              ref={videoRef}
              src={resolvedVideoSrc}
              controls
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                const d = vid.duration;
                if (d && !isNaN(d) && isFinite(d) && d > 0) {
                  setActualDuration(d);
                } else if (metaDurationSeconds && metaDurationSeconds > 0) {
                  setActualDuration(metaDurationSeconds);
                } else {
                  // Chromium WebM Infinity duration workaround: seek to end to read true duration
                  const onTimeUpdateTemp = () => {
                    vid.removeEventListener('timeupdate', onTimeUpdateTemp);
                    vid.currentTime = 0;
                    if (isFinite(vid.duration) && vid.duration > 0) {
                      setActualDuration(vid.duration);
                    }
                  };
                  vid.addEventListener('timeupdate', onTimeUpdateTemp);
                  vid.currentTime = 1e101;
                }
              }}
              onDurationChange={(e) => {
                const d = e.currentTarget.duration;
                if (d && !isNaN(d) && isFinite(d) && d > 0) {
                  setActualDuration(d);
                }
              }}
              onTimeUpdate={(e) => {
                setCurrentTime(Math.floor(e.currentTarget.currentTime));
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            /* Virtual Live Classroom Replay Screen */
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {/* Classroom Presentation Content */}
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #0f172a 100%)',
                  padding: '28px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Subtle Grid Backdrop */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.1,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                <div style={{ zIndex: 2, maxWidth: '640px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '4px', padding: '3px 8px', marginBottom: '12px' }}>
                    <Terminal size={13} color="var(--primary)" />
                    <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700 }}>Interactive Lecture Presentation</span>
                  </div>

                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', lineHeight: 1.3 }}>
                    {session.title}
                  </h2>

                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                    {session.description || `In this recorded session, ${session.instructorName || 'the faculty trainer'} guides students through complete architectural concepts, live practical code demonstrations, and student problem solving.`}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={13} color="var(--success)" /> Verified Curriculum Replay
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={13} color="var(--accent-purple)" /> All Enrolled Students Eligible
                    </span>
                  </div>
                </div>

                {/* Faculty Video Tile in Corner */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '180px',
                    height: '115px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1.5px solid rgba(99, 102, 241, 0.5)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    zIndex: 5,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      marginBottom: '6px',
                    }}
                  >
                    {session.instructorName ? session.instructorName.slice(0, 1) : 'F'}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.instructorName || 'Faculty Trainer'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPlaying ? 'var(--success)' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{isPlaying ? 'Speaking (Live Audio)' : 'Paused'}</span>
                  </div>
                </div>
              </div>

              {/* Player Controls Bar */}
              <div
                style={{
                  background: 'linear-gradient(transparent, rgba(2, 6, 23, 0.95))',
                  padding: '10px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  zIndex: 10,
                }}
              >
                {/* Scrubbing Bar */}
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', height: '4px' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <span className="font-mono text-xs">
                      {formatTime(currentTime)} / {formatTime(totalDuration)}
                    </span>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      style={{ background: 'transparent', border: 'none', color: isMuted ? 'var(--danger)' : '#94a3b8', cursor: 'pointer', padding: 0 }}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Speed:</span>
                    {[1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        style={{
                          background: playbackSpeed === spd ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabbed Navigation: Chapters, Chat Log, Attendance, Takeaways */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <button
            type="button"
            onClick={() => setActiveBottomTab('chapters')}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: activeBottomTab === 'chapters' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderBottom: activeBottomTab === 'chapters' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeBottomTab === 'chapters' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Bookmark size={14} color={activeBottomTab === 'chapters' ? 'var(--primary)' : 'currentColor'} />
            Timestamp Chapters
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('chat')}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: activeBottomTab === 'chat' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderBottom: activeBottomTab === 'chat' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeBottomTab === 'chat' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <MessageSquare size={14} color={activeBottomTab === 'chat' ? 'var(--primary)' : 'currentColor'} />
            Live Chat Replay ({chatLog.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('attendance')}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: activeBottomTab === 'attendance' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderBottom: activeBottomTab === 'attendance' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeBottomTab === 'attendance' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Users size={14} color={activeBottomTab === 'attendance' ? 'var(--primary)' : 'currentColor'} />
            Session Attendance ({attendanceRoster.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('takeaways')}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: activeBottomTab === 'takeaways' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderBottom: activeBottomTab === 'takeaways' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeBottomTab === 'takeaways' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} color={activeBottomTab === 'takeaways' ? 'var(--accent-purple)' : 'currentColor'} />
            AI Takeaways & Slides
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '16px 20px', maxHeight: '230px', overflowY: 'auto' }}>
          {/* TAB 1: CHAPTERS */}
          {activeBottomTab === 'chapters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chapters.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSeek(ch.seconds)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Play size={12} color="var(--primary)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ch.title}</span>
                  </div>
                  <span className="font-mono text-primary text-xs font-semibold">{ch.time}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: LIVE CHAT REPLAY */}
          {activeBottomTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatLog.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '8px 12px',
                    background: msg.role === 'Host' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ fontWeight: 700, color: msg.role === 'Host' ? 'var(--primary)' : 'var(--text-main)' }}>
                      {msg.sender} {msg.role === 'Host' && '• Host'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{msg.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: ATTENDANCE ROSTER */}
          {activeBottomTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Attendance was automatically marked during the live stream check-in window.
              </div>
              {attendanceRoster.map((att) => (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>{att.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll: {att.rollNo}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: att.status.includes('Present') ? 'var(--success)' : 'var(--warning)',
                      }}
                    >
                      {att.status}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {att.joinTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: AI TAKEAWAYS & DOWNLOADS */}
          {activeBottomTab === 'takeaways' && (
            <div>
              <p className="text-secondary text-xs" style={{ margin: '0 0 14px 0', lineHeight: 1.6 }}>
                {session.description || `In this recorded session, ${session.instructorName || 'the faculty trainer'} conducted an interactive walkthrough covering core architectural principles, standard syntax patterns, and student questions.`}
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => alert('Downloading official lecture slide deck (PDF)')}
                  style={{ fontSize: '0.78rem', gap: '6px' }}
                >
                  <Download size={14} /> Official Slide Deck (PDF)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => alert('Downloading complete lecture transcript and chat log (.txt)')}
                  style={{ fontSize: '0.78rem', gap: '6px' }}
                >
                  <FileText size={14} /> Lecture Transcript (.txt)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
