import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { Notification } from '../types';
import {
  Bell, CheckCheck, X, BookOpen, ClipboardCheck, Video, Award, Info,
  ExternalLink, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  // Close when Escape key is pressed
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  if (!isOpen) return null;

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return 'Just now';
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'course':
        return {
          icon: BookOpen,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.16)',
          border: 'rgba(59, 130, 246, 0.32)',
          label: 'Course',
        };
      case 'assessment':
        return {
          icon: ClipboardCheck,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(245, 158, 11, 0.32)',
          label: 'Assessment',
        };
      case 'live_class':
        return {
          icon: Video,
          color: '#5447FF',
          bg: 'rgba(84, 71, 255, 0.16)',
          border: 'rgba(84, 71, 255, 0.32)',
          label: 'Live Class',
        };
      case 'certificate':
        return {
          icon: Award,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.16)',
          border: 'rgba(236, 72, 153, 0.32)',
          label: 'Certificate',
        };
      default:
        return {
          icon: Info,
          color: '#818CF8',
          bg: 'rgba(129, 140, 248, 0.16)',
          border: 'rgba(129, 140, 248, 0.32)',
          label: 'System',
        };
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.link) {
      onClose();
      navigate(n.link);
    }
  };

  return (
    <>
      {/* Subtle backdrop overlay */}
      <div
        className="liquid-glass-backdrop"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Floating Liquid Glass Notification Panel */}
      <div
        className="liquid-glass-panel-container"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications Panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="liquid-glass-surface">
          {/* Subtle top edge highlight */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* Liquid Glass Header */}
          <div className="liquid-glass-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(84, 71, 255, 0.25) 0%, rgba(244, 114, 182, 0.2) 100%)',
                  border: '1px solid rgba(129, 140, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-indigo-soft, #818CF8)',
                  boxShadow: '0 4px 12px rgba(84, 71, 255, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                }}
              >
                <Bell size={16} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                    Notifications
                  </h3>
                  {unreadNotifications > 0 && (
                    <span
                      style={{
                        padding: '1px 7px',
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #EC4899 0%, #F232A9 100%)',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        boxShadow: '0 0 10px rgba(242, 50, 169, 0.45)',
                      }}
                    >
                      {unreadNotifications} new
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  style={{
                    background: 'rgba(129, 140, 248, 0.12)',
                    border: '1px solid rgba(129, 140, 248, 0.28)',
                    color: 'var(--brand-indigo-soft, #818CF8)',
                    padding: '4px 9px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                aria-label="Close notifications panel"
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Liquid Glass Filter Bar */}
          <div className="liquid-glass-filter-bar">
            <button
              type="button"
              className={`liquid-glass-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`liquid-glass-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadNotifications})
            </button>
          </div>

          {/* Scrollable Notification Cards List */}
          <div className="liquid-glass-scroll" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '44px 20px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'rgba(129, 140, 248, 0.08)',
                    border: '1px solid rgba(129, 140, 248, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-indigo-soft, #818CF8)',
                    boxShadow: '0 8px 24px rgba(84, 71, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {filter === 'unread' ? <Sparkles size={24} /> : <Bell size={24} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    {filter === 'unread' ? 'All caught up!' : 'No notifications'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {filter === 'unread'
                      ? 'You have reviewed all recent updates and alerts.'
                      : 'Upcoming classes, assignments, and announcements will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const config = getCategoryConfig(n.category);
                const IconComponent = config.icon;

                return (
                  <div
                    key={n.id}
                    className={`liquid-glass-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(n);
                      }
                    }}
                  >
                    {/* Category Icon Container */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '11px',
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: config.color,
                        boxShadow: `0 4px 12px ${config.bg}, inset 0 1px 1px rgba(255, 255, 255, 0.2)`,
                      }}
                    >
                      <IconComponent size={17} />
                    </div>

                    {/* Content Section */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          marginBottom: '3px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '1px 6px',
                              borderRadius: '6px',
                              background: config.bg,
                              color: config.color,
                            }}
                          >
                            {config.label}
                          </span>
                          <span
                            style={{
                              fontWeight: n.isRead ? 600 : 700,
                              fontSize: '0.84rem',
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {n.title}
                          </span>
                        </div>

                        {/* Relative Timestamp */}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>

                      {/* Message body */}
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          margin: '0 0 6px 0',
                          lineHeight: 1.45,
                        }}
                      >
                        {n.message}
                      </p>

                      {/* Direct Action button if link exists */}
                      {n.link && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationRead(n.id);
                              onClose();
                              navigate(n.link!);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: n.category === 'course'
                                ? 'linear-gradient(135deg, #2563EB 0%, #5447FF 100%)'
                                : 'rgba(129, 140, 248, 0.12)',
                              border: n.category === 'course'
                                ? '1px solid rgba(84, 71, 255, 0.45)'
                                : '1px solid rgba(129, 140, 248, 0.28)',
                              color: '#ffffff',
                              cursor: 'pointer',
                              boxShadow: n.category === 'course'
                                ? '0 3px 10px rgba(84, 71, 255, 0.25)'
                                : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{n.category === 'course' ? 'Join / View Course' : 'View Details'}</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Glowing Unread indicator dot */}
                    {!n.isRead && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          paddingTop: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #EC4899 0%, #F232A9 100%)',
                            boxShadow: '0 0 10px rgba(242, 50, 169, 0.85)',
                            display: 'inline-block',
                          }}
                          title="Unread"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Liquid Glass Footer */}
          <div className="liquid-glass-footer">
            <Link
              to="/notifications"
              onClick={onClose}
              style={{
                width: '100%',
                textAlign: 'center',
                padding: '7px 12px',
                borderRadius: '10px',
                fontSize: '0.76rem',
                fontWeight: 600,
                textDecoration: 'none',
                color: 'var(--text-secondary)',
                background: 'rgba(129, 140, 248, 0.08)',
                border: '1px solid rgba(129, 140, 248, 0.2)',
                transition: 'all 0.18s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Notification Preferences & Delivery Logs</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
