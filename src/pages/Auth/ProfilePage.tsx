import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { useThemeStore, ThemePreference } from '../../lib/themeStore';
import { useSignatureStore } from '../../lib/signatureStore';
import {
  User, Mail, Phone, Globe, Clock, Shield, Bell,
  Sliders, Save, KeyRound, CheckCircle2, Lock,
  Sun, Moon, Monitor, Check, Sparkles, CheckCheck,
  PenTool, RotateCcw, Upload, AlertTriangle, CheckCircle,
  Trophy
} from 'lucide-react';
import { AnimatedAvatar } from '../../components/AnimatedAvatar';
import { useUserAvatar } from '../../lib/avatarStore';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { preference, resolvedTheme, setTheme } = useThemeStore();
  const { avatarId, setAvatar, avatarMeta, allArchetypes } = useUserAvatar();
  const { getUserSignature, getDefaultSignatoryForUser, saveUserSignature } = useSignatureStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences' | 'signature'>('general');
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || 'Sarah');
  const [lastName, setLastName] = useState(user?.lastName || 'Chen');
  const [phone, setPhone] = useState(user?.phone || '+1 555-0101');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/New_York');
  const [locale, setLocale] = useState(user?.locale || 'en-US');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Digital Signature States
  const existingSig = user ? getUserSignature(user.id) : undefined;
  const defaultSig = getDefaultSignatoryForUser(user);
  const [signatoryName, setSignatoryName] = useState(existingSig?.signatoryName || defaultSig.name || '');
  const [designationTitle, setDesignationTitle] = useState(existingSig?.designationTitle || defaultSig.designation || '');
  const [signatureImage, setSignatureImage] = useState<string | undefined>(existingSig?.signatureImage || defaultSig.signatureImage);
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'type'>('type');
  const [typedSigText, setTypedSigText] = useState(existingSig?.signatoryName || defaultSig.name || '');
  const [typedSigFont, setTypedSigFont] = useState<'cursive' | 'serif' | 'formal'>('cursive');
  const [sigSavedSuccess, setSigSavedSuccess] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Drawing canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureImage(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(undefined);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        setSignatureImage(uploadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateTypedSignature = () => {
    if (!typedSigText.trim()) return;
    // Generate clean SVG signature
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="70" viewBox="0 0 240 70">
      <text x="50%" y="65%" text-anchor="middle" font-family="${typedSigFont === 'cursive' ? 'Brush Script MT, cursive' : typedSigFont === 'serif' ? 'Playfair Display, Georgia, serif' : 'Great Vibes, cursive'}" font-size="32" font-style="italic" fill="#0f172a">${typedSigText.trim()}</text>
    </svg>`;
    const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setSignatureImage(encoded);
  };

  const handleSaveSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!signatureImage && sigMode === 'type' && typedSigText.trim()) {
      generateTypedSignature();
    }
    saveUserSignature(user.id, {
      signatoryName: signatoryName.trim() || `${user.firstName} ${user.lastName}`,
      designationTitle: designationTitle.trim() || (user.activeRole === 'trainer' ? 'Lead Faculty' : 'Course Creator'),
      signatureImage: signatureImage || undefined,
      isConfigured: Boolean((signatoryName.trim() || user.displayName) && (signatureImage || typedSigText.trim())),
    });
    setSigSavedSuccess(true);
    setTimeout(() => setSigSavedSuccess(false), 3500);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Profile & Account Settings</h1>
          <p className="text-secondary text-sm">Manage your personal credentials, security keys, authorized digital signature, and accessibility preferences</p>
        </div>

        {(savedSuccess || sigSavedSuccess) && (
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
            <span>{sigSavedSuccess ? 'Authorized digital signature configured successfully!' : 'Profile settings updated successfully!'}</span>
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
        <button
          className={`tab-btn ${activeTab === 'signature' ? 'active' : ''}`}
          onClick={() => setActiveTab('signature')}
        >
          <PenTool size={16} />
          Authorized Signature
        </button>
      </div>

      {activeTab === 'general' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* User identity card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <AnimatedAvatar
                  size={96}
                  isCurrentUser={true}
                  interactive={true}
                  name={`${firstName} ${lastName}`}
                />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2px', color: '#fff' }}>
                {firstName} {lastName}
              </h3>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '0.74rem',
                fontWeight: 700,
                marginTop: '4px',
                marginBottom: '10px'
              }}>
                <Sparkles size={12} color="#38bdf8" />
                <span>{avatarMeta.name} &bull; {avatarMeta.title}</span>
              </div>
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

              {/* Leaderboard Standing Card for Students */}
              {(user?.activeRole === 'student' || user?.activeRole === 'learner' || user?.activeRole === 'guest') && (
                <div
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    border: '1.5px solid rgba(255, 215, 0, 0.35)',
                    borderRadius: '16px',
                    padding: '18px 16px',
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ffd700', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    <Trophy size={15} color="#ffd700" />
                    <span>Academy Leaderboard Standing</span>
                  </div>

                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffd700', lineHeight: 1.1, marginBottom: '4px' }}>
                    Rank #4
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                    3,420 XP &bull; 12-Day Streak 🔥
                  </div>

                  <p className="text-muted text-xs" style={{ margin: '0 0 14px 0', lineHeight: 1.4 }}>
                    Top 5% across Spring 2026 Cohort. Climbed 2 ranks this week!
                  </p>

                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-student-leaderboard-popup'))}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#0f172a',
                      fontWeight: 800,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <Trophy size={15} />
                    <span>View Leaderboard Pop-Up</span>
                  </button>
                </div>
              )}
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

          {/* Animated Avatar Selector Gallery */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>
                    Choose Your Animated Profile Avatar
                  </h3>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    Live Persona
                  </span>
                </div>
                <p className="text-secondary text-xs" style={{ margin: '4px 0 0' }}>
                  Select an animated vector scholar archetype. Your selection immediately syncs to your personal profile, navigation header, sidebar, and the leaderboard podium.
                </p>
              </div>

              {avatarSuccess && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Avatar Synced Everywhere!</span>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                gap: '14px',
              }}
            >
              {allArchetypes.map((arch) => {
                const isSelected = arch.id === avatarId;
                return (
                  <div
                    key={arch.id}
                    onClick={() => {
                      setAvatar(arch.id);
                      setAvatarSuccess(true);
                      setTimeout(() => setAvatarSuccess(false), 2500);
                    }}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : 'var(--bg-input)',
                      border: isSelected
                        ? '2px solid #38bdf8'
                        : '1.5px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '16px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected
                        ? '0 0 20px rgba(56, 189, 248, 0.3), 0 8px 20px rgba(0,0,0,0.4)'
                        : '0 4px 12px rgba(0,0,0,0.15)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <AnimatedAvatar
                      avatarId={arch.id}
                      size={60}
                      interactive={true}
                      ringVariant={isSelected ? 'cyan' : 'auto'}
                    />

                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#38bdf8' : '#fff', marginTop: '12px' }}>
                      {arch.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: isSelected ? '#93c5fd' : 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                      {arch.title}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '6px', minHeight: '32px' }}>
                      {arch.flavor}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      {isSelected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            padding: '3px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} /> Active Avatar
                        </span>
                      ) : (
                        <span
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
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

      {activeTab === 'signature' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          {/* Signature Configuration Form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PenTool size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Authorized Digital Signature</h3>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  Configure your authorized signatory identity for Course and Assessment certificates
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSignature} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                    Signatory Full Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. Dr. James Wilson"
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                    Designation / Official Title *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={designationTitle}
                    onChange={(e) => setDesignationTitle(e.target.value)}
                    placeholder="e.g. Principal Faculty & Curriculum Director"
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                  />
                </div>
              </div>

              {/* Mode switch */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                  Signature Method
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${sigMode === 'type' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setSigMode('type'); if (!typedSigText) setTypedSigText(signatoryName); }}
                    style={{ flex: 1 }}
                  >
                    Type Stylized Signature
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${sigMode === 'draw' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSigMode('draw')}
                    style={{ flex: 1 }}
                  >
                    Draw on Screen
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${sigMode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSigMode('upload')}
                    style={{ flex: 1 }}
                  >
                    Upload Image
                  </button>
                </div>
              </div>

              {/* Method 1: Type */}
              {sigMode === 'type' && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px' }}>
                      Signatory Text
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={typedSigText}
                      onChange={(e) => setTypedSigText(e.target.value)}
                      placeholder="Type your signature name"
                      style={{ width: '100%', padding: '8px 12px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px' }}>
                      Script Style
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['cursive', 'serif', 'formal'] as const).map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setTypedSigFont(font)}
                          className={`btn btn-sm ${typedSigFont === font ? 'btn-primary' : 'btn-outline'}`}
                          style={{
                            flex: 1,
                            textTransform: 'capitalize',
                            fontFamily: font === 'cursive' ? 'Brush Script MT, cursive' : font === 'serif' ? 'Georgia, serif' : 'cursive',
                            fontSize: '1rem'
                          }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={generateTypedSignature}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Generate Signature Mark
                  </button>
                </div>
              )}

              {/* Method 2: Draw */}
              {sigMode === 'draw' && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted">Use mouse or touch pad to sign inside the box</span>
                    <button type="button" onClick={clearCanvas} className="btn btn-xs btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotateCcw size={12} /> Clear Pad
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{
                      width: '100%',
                      height: '140px',
                      background: '#ffffff',
                      border: '2px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'crosshair',
                      touchAction: 'none'
                    }}
                  />
                </div>
              )}

              {/* Method 3: Upload */}
              {sigMode === 'upload' && (
                <div style={{
                  padding: '20px',
                  background: 'var(--bg-elevated)',
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}>
                  <Upload size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                  <p className="text-xs" style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                    Upload transparent PNG or SVG signature image
                  </p>
                  <p className="text-muted text-xs" style={{ margin: '0 0 12px 0' }}>
                    Recommended size: 400x120px with transparent background
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleFileUpload}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> Save Authorized Signature
                </button>
              </div>
            </form>
          </div>

          {/* Signature Preview Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ background: '#fdfbf7', border: '2px solid #e2e8f0', color: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#d97706' }}>
                  Official Certificate Preview
                </span>
                <span className={`badge ${signatureImage ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                  {signatureImage ? 'Configured & Active' : 'Unconfigured'}
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                minHeight: '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}>
                {signatureImage ? (
                  <div style={{ marginBottom: '8px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={signatureImage}
                      alt="Authorized Signature"
                      style={{ maxHeight: '55px', maxWidth: '220px', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    marginBottom: '16px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fffbeb',
                    border: '1px dashed #f59e0b',
                    color: '#92400e',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={14} />
                    <span>No signature image uploaded or drawn yet</span>
                  </div>
                )}

                {/* Signature Line */}
                <div style={{ width: '180px', height: '1.5px', background: '#94a3b8', marginBottom: '6px' }} />

                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  {signatoryName || 'Authorized Signatory'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {designationTitle || 'Lead Faculty & Curriculum Director'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Authorized Signatory
                </div>
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                <strong>VeniLearn Credential Integrity:</strong> When you publish a course or assessment with certificate issuance, this signatory snapshot is affixed to all credentials issued to qualifying learners.
              </div>
            </div>

            <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                Signatory Requirements
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <li>Course and assessment certificates require an approved signatory.</li>
                <li>Admins can select another approved institutional signatory where authorized.</li>
                <li>Signatory snapshots are frozen at issuance time and persist permanently.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
