import React, { useState } from 'react';
import { LiveSession } from '../../../types';
import {
  Play, Pause, Volume2, Maximize, X, Download, FileText,
  Clock, CheckCircle2, Bookmark, Sparkles, Share2
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(145); // 02:25 into recording
  const totalDuration = (session?.durationMinutes || 60) * 60;

  if (!isOpen || !session) return null;

  const chapters = [
    { time: '00:00', title: 'Session Introduction & Agenda' },
    { time: '12:30', title: 'Theoretical Framework & Architecture Diagrams' },
    { time: '28:45', title: 'Live Code Walkthrough & Best Practices' },
    { time: '48:10', title: 'Student Debugging & Q&A Clinic' },
    { time: '58:00', title: 'Homework Assignment & Capstone Review' },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          padding: 0,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-secondary">Recorded Session Archival</span>
              <span className="text-muted text-xs font-mono">{session.date}</span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
              {session.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player Area */}
        <div
          style={{
            background: '#020617',
            height: '380px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              boxShadow: '0 0 30px var(--primary-glow)',
              transition: 'var(--transition)',
            }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={38} /> : <Play size={38} style={{ marginLeft: '4px' }} />}
          </div>

          <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
            {isPlaying ? 'Playing on-demand video stream...' : 'Click play to start video replay'}
          </div>

          {/* Bottom Video Controls Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(2, 6, 23, 0.95))',
              padding: '12px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Scrubber Bar */}
            <input
              type="range"
              min={0}
              max={totalDuration}
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <span className="font-mono">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
                <Volume2 size={16} style={{ color: '#94a3b8' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Speed buttons */}
                {[1, 1.25, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      background: playbackSpeed === spd ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
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

        {/* Chapters & Session Notes */}
        <div
          style={{
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {/* Chapter Bookmarks */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
              <Bookmark size={16} color="var(--primary)" />
              <span>Timestamp Chapters</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {chapters.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-card)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const [m, s] = ch.time.split(':').map(Number);
                    setCurrentTime(m * 60 + s);
                    setIsPlaying(true);
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{ch.title}</span>
                  <span className="font-mono text-primary text-xs">{ch.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Key Takeaways & Downloads */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
              <Sparkles size={16} color="var(--accent-purple)" />
              <span>AI Executive Takeaways</span>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Faculty Dr. James Wilson demonstrated compound component hooks, optimized cache invalidation in TanStack Query, and resolved student race-condition errors during asynchronous mutations.
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => alert('Downloading official session lecture slide deck (PDF demo)')}
              >
                <Download size={13} /> Slide Deck (PDF)
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => alert('Downloading verified attendance and Q&A chat log')}
              >
                <FileText size={13} /> Chat Log (.txt)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
