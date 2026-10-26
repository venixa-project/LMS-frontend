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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !session) return null;

  // Dynamic chapters based on session agenda or smart timestamps
  const chapters = React.useMemo(() => {
    if (session.agenda) {
      const lines = session.agenda.split('\n').filter(Boolean);
      if (lines.length > 0) {
        const step = Math.floor(totalDuration / (lines.length + 1));
        return lines.map((line, idx) => {
          const timeSecs = idx * step;
          const cleanTitle = line.replace(/^[0-9]+[\.\-\)]\s*/, '');
          return { time: formatTime(timeSecs), title: cleanTitle };
        });
      }
    }
    return [
      { time: '00:00', title: 'Lecture Introduction & Learning Objectives' },
      { time: formatTime(Math.floor(totalDuration * 0.2)), title: 'Core Architectural Concepts & Theory' },
      { time: formatTime(Math.floor(totalDuration * 0.45)), title: 'Live Coding Demo & Problem Solving' },
      { time: formatTime(Math.floor(totalDuration * 0.75)), title: 'Student Debugging & Interactive Q&A' },
      { time: formatTime(Math.floor(totalDuration * 0.9)), title: 'Summary Takeaways & Assignment Brief' },
    ];
  }, [session, totalDuration]);

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
              <span className="badge badge-secondary" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>Recorded Class Replay</span>
              <span className="text-muted text-xs font-mono">{session.date || 'Recorded Lecture'}</span>
              <span className="text-muted text-xs">• {session.instructorName || 'Faculty Trainer'}</span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
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
            {isPlaying ? 'Streaming High-Definition Lecture Stream (1080p)...' : 'Click play to start video replay'}
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
                    setCurrentTime(m * 60 + (s || 0));
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
              {session.description || `In this session, ${session.instructorName || 'the instructor'} conducted a detailed code walkthrough covering architectural best practices and practical implementations.`}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {session.materials && session.materials.length > 0 ? (
                session.materials.map((mat, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert(`Downloading "${mat}"`)}
                    style={{ fontSize: '0.75rem', gap: '4px' }}
                  >
                    <Download size={13} /> {mat}
                  </button>
                ))
              ) : (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert('Downloading official lecture slide deck (PDF)')}
                  >
                    <Download size={13} /> Slide Deck (PDF)
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert('Downloading transcript and chat log')}
                  >
                    <FileText size={13} /> Transcript (.txt)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
