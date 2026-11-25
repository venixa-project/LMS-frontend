import React, { useState, useEffect, useMemo } from 'react';
import {
  Video, AlertTriangle, Trash2, Download,
  RefreshCw, Clock, Eye, Play,
  Copy, Check, X, ChevronDown, ChevronRight,
  ClipboardCheck, Calendar, BookOpen, User
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export interface ProctoringRecording {
  id: string;
  tenantId: string;
  sessionId: string;
  attemptId?: string | null;
  studentId: string;
  studentName?: string | null;
  studentRollNo?: string | null;
  studentEmail?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  assessmentId: string;
  assessmentTitle?: string | null;
  recordingType: 'full_session' | 'strike_video' | 'incident_clip';
  strikeNumber?: number | null;
  s3Key: string;
  s3Bucket: string;
  videoUrl: string;
  fileSizeBytes: number;
  durationSeconds: number;
  mimeType: string;
  status: 'active' | 'expired' | 'deleted';
  recordedAt: string;
  expiresAt: string;
  deletedAt?: string | null;
  metadata?: any;
}

export const ProctoringVideosPage: React.FC = () => {
  const [recordings, setRecordings] = useState<ProctoringRecording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
  const [expandedAssessments, setExpandedAssessments] = useState<Record<string, boolean>>({});

  // Active Video Modal
  const [selectedVideo, setSelectedVideo] = useState<ProctoringRecording | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch recordings
  const fetchData = async () => {
    setLoading(true);
    try {
      const recRes = await apiClient.get<{ recordings: ProctoringRecording[] }>('/proctoring/recordings?limit=200');
      if (recRes.data) {
        setRecordings(recRes.data.recordings || []);
      }
    } catch (err: any) {
      console.error('Failed to load proctoring videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Format date and time
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Group all recordings by Assessment / Quiz name
  const assessmentGroups = useMemo(() => {
    // Sort all recordings strictly date and time wise (newest first)
    const sorted = [...recordings].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    const map = new Map<string, {
      assessmentId: string;
      assessmentTitle: string;
      courseTitle: string;
      recordings: ProctoringRecording[];
      latestDate: string;
    }>();

    for (const rec of sorted) {
      const key = rec.assessmentId || rec.assessmentTitle || 'unassigned';
      if (!map.has(key)) {
        map.set(key, {
          assessmentId: rec.assessmentId,
          assessmentTitle: rec.assessmentTitle || 'General Assessment / Quiz',
          courseTitle: rec.courseTitle || 'Curriculum Course',
          recordings: [],
          latestDate: rec.recordedAt,
        });
      }
      map.get(key)!.recordings.push(rec);
    }

    return Array.from(map.values());
  }, [recordings]);

  // Expand all by default when loaded
  useEffect(() => {
    if (assessmentGroups.length > 0) {
      const initial: Record<string, boolean> = {};
      assessmentGroups.forEach((group) => {
        initial[group.assessmentId] = true;
      });
      setExpandedAssessments(initial);
    }
  }, [assessmentGroups]);

  // Toggle single assessment accordion
  const toggleAssessment = (assessmentId: string) => {
    setExpandedAssessments((prev) => ({
      ...prev,
      [assessmentId]: !prev[assessmentId],
    }));
  };

  // Delete individual video
  const handleDeleteVideo = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/proctoring/recordings/${deletingId}`);
      setRecordings((prev) => prev.filter((r) => r.id !== deletingId));
      if (selectedVideo?.id === deletingId) {
        setSelectedVideo(null);
      }
      setDeletingId(null);
    } catch (err: any) {
      alert(`Could not delete recording: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy S3 URI
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filter groups if a specific assessment tab is clicked
  const visibleGroups = useMemo(() => {
    if (selectedAssessmentId === 'all') return assessmentGroups;
    return assessmentGroups.filter((g) => g.assessmentId === selectedAssessmentId);
  }, [assessmentGroups, selectedAssessmentId]);

  return (
    <div className="page-body" style={{ padding: '24px 32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="badge badge-primary">Assessments & Evaluation</span>
          <span className="badge badge-info">{recordings.length} Total Recordings</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Proctoring Videos
        </h1>
        <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>
          All exam and quiz proctoring recordings grouped by assessment and listed one by one in date and time order.
        </p>
      </div>

      {/* Assessments & Quizzes Selector Navigation */}
      {assessmentGroups.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.05em' }}>
            Select Assessment / Quiz:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* "All Assessments" Button */}
            <button
              onClick={() => setSelectedAssessmentId('all')}
              className={`btn btn-sm ${selectedAssessmentId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)' }}
            >
              <ClipboardCheck size={14} />
              All Assessments ({recordings.length})
            </button>

            {/* Individual Assessment Buttons */}
            {assessmentGroups.map((group) => {
              const isSelected = selectedAssessmentId === group.assessmentId;
              return (
                <button
                  key={group.assessmentId}
                  onClick={() => setSelectedAssessmentId(group.assessmentId)}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)' }}
                >
                  <Video size={14} />
                  <span>{group.assessmentTitle}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {group.recordings.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <div className="text-secondary text-sm">Loading proctoring recordings...</div>
        </div>
      ) : recordings.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Video size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
            No Proctoring Recordings Yet
          </h3>
          <p className="text-secondary text-sm" style={{ maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
            When students take exams and warning strikes or session videos are recorded, they will appear here under each assessment in chronological date and time order.
          </p>
        </div>
      ) : (
        /* Grouped Assessments & Quizzes */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {visibleGroups.map((group) => {
            const isExpanded = expandedAssessments[group.assessmentId] !== false;

            return (
              <div
                key={group.assessmentId}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Assessment Header Banner (Click to Expand / Collapse) */}
                <div
                  onClick={() => toggleAssessment(group.assessmentId)}
                  style={{
                    padding: '18px 24px',
                    background: 'var(--bg-card-subtle)',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--gradient-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ClipboardCheck size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {group.assessmentTitle}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <BookOpen size={13} style={{ color: 'var(--primary)' }} />
                          {group.courseTitle}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          Latest: {formatDateTime(group.latestDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge badge-primary">
                      {group.recordings.length} {group.recordings.length === 1 ? 'Recording' : 'Recordings'}
                    </span>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* Recordings List (Date and Time Wise One by One) */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {group.recordings.map((recording, idx) => {
                      const isStrike = recording.recordingType === 'strike_video';
                      const strikeNum = recording.strikeNumber || 1;
                      const isCopied = copiedKey === recording.id;

                      return (
                        <div
                          key={recording.id}
                          className="card card-interactive"
                          style={{
                            padding: '16px 20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '16px',
                          }}
                        >
                          {/* Left: Video Preview & Student Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: '1 1 340px' }}>
                            {/* Video Thumbnail with Play Button */}
                            <div
                              onClick={() => setSelectedVideo(recording)}
                              style={{
                                width: '130px',
                                height: '78px',
                                background: '#050816',
                                borderRadius: '8px',
                                position: 'relative',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              <video
                                src={recording.videoUrl}
                                preload="metadata"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                              />
                              <div style={{
                                position: 'absolute',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                              }}>
                                <Play size={14} style={{ marginLeft: '2px', fill: 'currentColor' }} />
                              </div>
                            </div>

                            {/* Candidate & Strike Info */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #2563EB 0%, #EC4899 100%)',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {(recording.studentName || 'C').slice(0, 2).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                  {recording.studentName || 'Candidate'}
                                </span>
                              </div>

                              <div className="text-secondary text-xs" style={{ marginBottom: '6px' }}>
                                {recording.studentRollNo ? `Roll: ${recording.studentRollNo}` : recording.studentEmail || 'Registered Student'}
                              </div>

                              <div>
                                {isStrike ? (
                                  <span className={`badge ${strikeNum >= 3 ? 'badge-danger' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={12} />
                                    Warning Strike {strikeNum} of 3 {strikeNum >= 3 ? '(Auto-Submit)' : ''}
                                  </span>
                                ) : (
                                  <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Video size={12} />
                                    Full Exam Session Video
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle: Date and Time One by One */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                              Date & Time Recorded
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              <Calendar size={14} style={{ color: 'var(--primary)' }} />
                              {formatDateTime(recording.recordedAt)}
                            </div>
                            <div className="text-secondary text-xs">
                              {recording.durationSeconds > 0 ? `${recording.durationSeconds}s duration` : 'Video proof'} • {formatBytes(recording.fileSizeBytes)}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedVideo(recording)}
                              className="btn btn-primary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Play size={14} style={{ fill: 'currentColor' }} />
                              Watch Recording
                            </button>

                            <a
                              href={recording.videoUrl}
                              download={`recording-${recording.studentRollNo || 'proof'}-${recording.id}.webm`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              title="Download Video File"
                              style={{ padding: '6px 10px' }}
                            >
                              <Download size={14} />
                            </a>

                            <button
                              onClick={() => setDeletingId(recording.id)}
                              className="btn btn-ghost btn-sm"
                              title="Delete Recording"
                              style={{ padding: '6px 10px', color: 'var(--danger)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="modal-backdrop" onClick={() => setSelectedVideo(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '92%', overflow: 'hidden' }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={18} />
                  {selectedVideo.assessmentTitle || 'Assessment Recording'}
                </h3>
                <p>
                  Candidate: <strong>{selectedVideo.studentName || 'Candidate'}</strong> ({selectedVideo.studentRollNo || selectedVideo.studentEmail || 'ID: ' + selectedVideo.studentId})
                </p>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="close-btn">
                <X size={18} />
              </button>
            </div>

            {/* Video Player Box */}
            <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                src={selectedVideo.videoUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>

            {/* Modal Body / Metadata Grid */}
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px', fontSize: '0.8rem' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Assessment / Quiz</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedVideo.assessmentTitle || 'Assessment Exam'}
                  </div>
                </div>

                <div>
                  <span className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Course</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedVideo.courseTitle || 'Curriculum Course'}
                  </div>
                </div>

                <div>
                  <span className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Date & Time Recorded</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {formatDateTime(selectedVideo.recordedAt)}
                  </div>
                </div>

                <div>
                  <span className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Type & Duration</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedVideo.recordingType === 'strike_video'
                      ? `Strike ${selectedVideo.strikeNumber || 1} Warning (15s)`
                      : 'Full Session Recording'}
                  </div>
                </div>
              </div>

              {/* S3 URI Display */}
              <div style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem'
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                  s3://{selectedVideo.s3Bucket}/{selectedVideo.s3Key}
                </span>
                <button
                  onClick={() => handleCopy(`s3://${selectedVideo.s3Bucket}/${selectedVideo.s3Key}`, 'modal')}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {copiedKey === 'modal' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  {copiedKey === 'modal' ? 'Copied' : 'Copy URI'}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setDeletingId(selectedVideo.id)}
                className="btn btn-danger btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} />
                Delete from S3
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={selectedVideo.videoUrl}
                  download={`recording-${selectedVideo.studentRollNo || 'proof'}.webm`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  Download WebM
                </a>
                <button onClick={() => setSelectedVideo(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-backdrop" onClick={() => setDeletingId(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '90%' }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                Confirm Video Deletion
              </h3>
              <button onClick={() => setDeletingId(null)} className="close-btn">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p className="text-secondary text-sm" style={{ margin: 0, lineHeight: 1.6 }}>
                Are you sure you want to permanently delete this video recording from the AWS S3 bucket and database? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                disabled={isDeleting}
                className="btn btn-danger btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProctoringVideosPage;
