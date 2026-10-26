import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { useThemeStore, ThemePreference } from '../../lib/themeStore';
import {
  User, Mail, Phone, Globe, Clock, Shield, Bell,
  Sliders, Save, KeyRound, CheckCircle2, Lock,
  Sun, Moon, Monitor, Check
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { preference, resolvedTheme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences'>('general');

  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || 'Sarah');
  const [lastName, setLastName] = useState(user?.lastName || 'Chen');
  const [phone, setPhone] = useState(user?.phone || '+1 555-0101');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/New_York');
  const [locale, setLocale] = useState(user?.locale || 'en-US');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Accessibility & Preferences
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [digestMode, setDigestMode] = useState('daily');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Profile & Account Settings</h1>
          <p className="text-secondary text-sm">Manage your personal credentials, security keys, and accessibility preferences</p>
        </div>

        {savedSuccess && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>Profile settings updated successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <User size={16} />
          General Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={16} />
          Security & MFA
        </button>
        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Sliders size={16} />
          Accessibility & Notifications
        </button>
      </div>

      {activeTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* User identity card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
              color: '#fff',
              fontSize: '2.5rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-glow)'
            }}>
              {firstName[0]}{lastName[0]}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{firstName} {lastName}</h3>
            <p className="text-muted text-xs" style={{ marginBottom: '12px' }}>{user?.email}</p>
            <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
              {user?.activeRole.replace('_', ' ')}
            </span>

            <div style={{
              marginTop: '24px',
              width: '100%',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              textAlign: 'left',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Account Status:</span>
                <span className="badge badge-active">{user?.status || 'Active'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">MFA Enabled:</span>
                <span>{user?.mfaEnabled ? 'Yes (TOTP)' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Member Since:</span>
                <span>Jan 2026</span>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Personal Information</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    className="form-input"
                    value={user?.email || 'admin@lms.demo'}
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                  <span className="form-helper">Managed by organizational SSO / directory</span>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Phone size={14} /> Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    <Globe size={14} /> Language / Locale
                  </label>
                  <select
                    className="form-select"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="es-ES">Español (Spanish)</option>
                    <option value="fr-FR">Français (French)</option>
                    <option value="de-DE">Deutsch (German)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Clock size={14} /> Timezone
                  </label>
                  <select
                    className="form-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London (GMT+0 / BST)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Password Management</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Update your account password or configure single sign-on synchronization.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" placeholder="••••••••" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" placeholder="••••••••" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" placeholder="••••••••" className="form-input" />
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
              <KeyRound size={14} />
              Update Password
            </button>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Two-Factor Authentication (2FA / MFA)</h3>
                <p className="text-secondary text-sm">Add an extra layer of defense using an Authenticator app (TOTP)</p>
              </div>
              <span className="badge badge-active">MFA Enforced</span>
            </div>
            <p className="text-muted text-xs">
              Configured via Google Authenticator / Microsoft Authenticator on 2026-02-10.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-secondary btn-sm">Regenerate Recovery Codes</button>
              <button className="btn btn-secondary btn-sm">Re-pair Authenticator App</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Interface Theme Selection */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Interface Theme</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Choose your preferred appearance or sync with your operating system settings
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {[
                {
                  id: 'light' as ThemePreference,
                  label: 'Light Theme',
                  description: 'Clean, high-visibility daylight appearance',
                  icon: Sun,
                  color: 'var(--warning)'
                },
                {
                  id: 'dark' as ThemePreference,
                  label: 'Dark Theme',
                  description: 'Eye-comfort dark palette for low-light environments',
                  icon: Moon,
                  color: 'var(--primary)'
                },
                {
                  id: 'system' as ThemePreference,
                  label: 'System (Device)',
                  description: `Automatically follows OS scheme (currently ${resolvedTheme})`,
                  icon: Monitor,
                  color: 'var(--accent-cyan)'
                }
              ].map((opt) => {
                const IconComp = opt.icon;
                const isSelected = preference === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    style={{
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComp size={20} color={opt.color} />
                      </div>
                      {isSelected && (
                        <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem' }}>
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: '2px' }}>
                        {opt.label}
                      </div>
                      <p className="text-muted text-xs" style={{ margin: 0, lineHeight: 1.35 }}>
                        {opt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Accessibility Preferences</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Personalize interface contrast, motion, and screen reader announcements
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>High Contrast Mode</div>
                  <div className="text-muted text-xs">Enhances text borders and interactive elements</div>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Reduced Motion</div>
                  <div className="text-muted text-xs">Disables subtle transitions and CSS animations</div>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email Notifications</div>
                  <div className="text-muted text-xs">Course enrollments, graded submissions, live session invites</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>In-App Alerts & Sound</div>
                  <div className="text-muted text-xs">Show badge indicators and desktop toast alerts</div>
                </div>
                <input
                  type="checkbox"
                  checked={inAppAlerts}
                  onChange={(e) => setInAppAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
