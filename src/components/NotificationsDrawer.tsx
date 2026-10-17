import React from 'react';
import { useAuthStore } from '../lib/store';
import { Bell, CheckCheck, X, BookOpen, ClipboardCheck, Video, Award, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useAuthStore();

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'course': return <BookOpen size={16} color="var(--primary)" />;
      case 'assessment': return <ClipboardCheck size={16} color="var(--warning)" />;
      case 'live_class': return <Video size={16} color="var(--accent-cyan)" />;
      case 'certificate': return <Award size={16} color="var(--success)" />;
      default: return <Info size={16} color="var(--text-secondary)" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Notifications</h3>
            {unreadNotifications > 0 && (
              <span className="badge badge-primary">{unreadNotifications} new</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadNotifications > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={markAllNotificationsRead}
                title="Mark all as read"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                <CheckCheck size={14} />
                Read All
              </button>
            )}
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: n.isRead ? 'var(--bg-card)' : 'var(--primary-light)',
                    border: n.isRead ? '1px solid var(--border-subtle)' : '1px solid rgba(99, 102, 241, 0.3)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getCategoryIcon(n.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</span>
                        {!n.isRead && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{n.message}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={onClose}
                            style={{ color: 'var(--primary)', fontWeight: 600 }}
                          >
                            View Details &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <Link
            to="/notifications"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
          >
            Notification Preferences & Delivery Logs
          </Link>
        </div>
      </div>
    </div>
  );
};
