import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { useAuthStore } from '../../../lib/store';
import { HeadquartersSelectorModal } from './HeadquartersSelectorModal';
import {
  Building2,
  Building,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Clock,
  ShieldCheck,
  Edit,
  Save,
  X,
  Sparkles,
  Users,
  CheckCircle2,
  FileText,
  AlertCircle,
  Upload,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

export const CompanyProfileView: React.FC = () => {
  const { currentCompany, updateCompany, branches, employees, showToast } = useHRMS();
  const { user } = useAuthStore();
  const isAdmin = true; // Authorized Admin scope

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isHqModalOpen, setIsHqModalOpen] = useState<boolean>(false);

  // Headquarters from branches
  const hqBranch = useMemo(() => branches.find((b) => b.isHeadquarters), [branches]);

  // Form State
  const [name, setName] = useState<string>(currentCompany.name || 'Venixa Private Limited');
  const [tradeName, setTradeName] = useState<string>(currentCompany.tradeName || 'Venixa Technologies');
  const [code, setCode] = useState<string>(currentCompany.code || 'VNX');
  const [website, setWebsite] = useState<string>(currentCompany.website || 'https://www.venixatech.com');
  const [logo, setLogo] = useState<string>(currentCompany.logo || '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state if company data updates while not editing
  useEffect(() => {
    if (!isEditing) {
      setName(currentCompany.name || 'Venixa Private Limited');
      setTradeName(currentCompany.tradeName || 'Venixa Technologies');
      setCode(currentCompany.code || 'VNX');
      setWebsite(currentCompany.website || 'https://www.venixatech.com');
      setLogo(currentCompany.logo || '');
      setCinNumber(currentCompany.cinNumber || 'U72200KA2023PTC178921');
      setTaxId(currentCompany.taxId || 'AABCV1234F');
      setGstin(currentCompany.gstin || '29AABCV1234F1Z5');
      setIncorporationDate(currentCompany.incorporationDate || '2023-01-15');
      setStreetAddress(currentCompany.streetAddress || 'Global Tech Park, Outer Ring Road');
      setSuite(currentCompany.suite || 'Tower B, 7th Floor');
      setCity(currentCompany.city || 'Bengaluru');
      setState(currentCompany.state || 'Karnataka');
      setPostalCode(currentCompany.postalCode || '560103');
      setCountry(currentCompany.country || 'India');
      setCurrency(currentCompany.currency || 'INR (₹)');
      setTimezone(currentCompany.timezone || 'Asia/Kolkata (IST, UTC+5:30)');
      setFiscalYear(currentCompany.fiscalYear || 'April 1 - March 31');
      setWorkWeek(currentCompany.workWeek || 'Monday - Friday (5 Days)');
      setOfficialEmail(currentCompany.officialEmail || 'corporate@venixatech.com');
      setPhone(currentCompany.phone || '+91 (80) 4123-9800');
      setLogoError(null);
      setShowRemoveConfirm(false);
    }
  }, [currentCompany, isEditing]);

  // Legal & Tax IDs
  const [cinNumber, setCinNumber] = useState<string>(
    currentCompany.cinNumber || 'U72200KA2023PTC178921'
  );
  const [taxId, setTaxId] = useState<string>(currentCompany.taxId || 'AABCV1234F');
  const [gstin, setGstin] = useState<string>(currentCompany.gstin || '29AABCV1234F1Z5');
  const [incorporationDate, setIncorporationDate] = useState<string>(
    currentCompany.incorporationDate || '2023-01-15'
  );

  // Registered Address
  const [streetAddress, setStreetAddress] = useState<string>(
    currentCompany.streetAddress || 'Global Tech Park, Outer Ring Road'
  );
  const [suite, setSuite] = useState<string>(currentCompany.suite || 'Tower B, 7th Floor');
  const [city, setCity] = useState<string>(currentCompany.city || 'Bengaluru');
  const [state, setState] = useState<string>(currentCompany.state || 'Karnataka');
  const [postalCode, setPostalCode] = useState<string>(currentCompany.postalCode || '560103');
  const [country, setCountry] = useState<string>(currentCompany.country || 'India');

  // Fiscal & Operations
  const [currency, setCurrency] = useState<string>(currentCompany.currency || 'INR (₹)');
  const [timezone, setTimezone] = useState<string>(
    currentCompany.timezone || 'Asia/Kolkata (IST, UTC+5:30)'
  );
  const [fiscalYear, setFiscalYear] = useState<string>(
    currentCompany.fiscalYear || 'April 1 - March 31'
  );
  const [workWeek, setWorkWeek] = useState<string>(
    currentCompany.workWeek || 'Monday - Friday (5 Days)'
  );

  // Official Contacts
  const [officialEmail, setOfficialEmail] = useState<string>(
    currentCompany.officialEmail || 'corporate@venixatech.com'
  );
  const [phone, setPhone] = useState<string>(currentCompany.phone || '+91 (80) 4123-9800');
  const [hrEmail, setHrEmail] = useState<string>('people@venixatech.com');

  const companyEmployees = employees.filter(
    (e) => e.companyId === currentCompany.id || e.companyId === 'comp-1'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);
    setShowRemoveConfirm(false);

    // Supported formats: PNG, JPG/JPEG, and SVG
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validMimeTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(ext)) {
      setLogoError('Unsupported file format. Please upload a PNG, JPG, or SVG image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Maximum file size: 2 MB
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
      setLogoError(`File size exceeds 2 MB limit (selected: ${sizeInMb} MB). Please choose a smaller image.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Read as Data URL for immediate preview and local state update
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogo(dataUrl);
        showToast('Logo preview updated. Click "Save Changes" to apply.', 'info');
      }
    };
    reader.onerror = () => {
      setLogoError('Failed to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowRemoveConfirm(false);
    setLogoError(null);
    // Reset all form state to current committed company values
    setName(currentCompany.name || 'Venixa Private Limited');
    setTradeName(currentCompany.tradeName || 'Venixa Technologies');
    setCode(currentCompany.code || 'VNX');
    setWebsite(currentCompany.website || 'https://www.venixatech.com');
    setLogo(currentCompany.logo || '');
    setCinNumber(currentCompany.cinNumber || 'U72200KA2023PTC178921');
    setTaxId(currentCompany.taxId || 'AABCV1234F');
    setGstin(currentCompany.gstin || '29AABCV1234F1Z5');
    setIncorporationDate(currentCompany.incorporationDate || '2023-01-15');
    setStreetAddress(currentCompany.streetAddress || 'Global Tech Park, Outer Ring Road');
    setSuite(currentCompany.suite || 'Tower B, 7th Floor');
    setCity(currentCompany.city || 'Bengaluru');
    setState(currentCompany.state || 'Karnataka');
    setPostalCode(currentCompany.postalCode || '560103');
    setCountry(currentCompany.country || 'India');
    setCurrency(currentCompany.currency || 'INR (₹)');
    setTimezone(currentCompany.timezone || 'Asia/Kolkata (IST, UTC+5:30)');
    setFiscalYear(currentCompany.fiscalYear || 'April 1 - March 31');
    setWorkWeek(currentCompany.workWeek || 'Monday - Friday (5 Days)');
    setOfficialEmail(currentCompany.officialEmail || 'corporate@venixatech.com');
    setPhone(currentCompany.phone || '+91 (80) 4123-9800');
  };

  const handleSave = () => {
    setIsEditing(false);
    setShowRemoveConfirm(false);
    setLogoError(null);
    updateCompany({
      name,
      tradeName,
      code,
      website,
      logo,
      cinNumber,
      taxId,
      gstin,
      incorporationDate,
      streetAddress,
      suite,
      city,
      state,
      postalCode,
      country,
      currency,
      timezone,
      fiscalYear,
      workWeek,
      officialEmail,
      phone,
    });
    showToast('Company Profile and Legal Entity settings updated successfully!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '14px',
                background: (isEditing ? logo : currentCompany.logo) ? 'var(--bg-input)' : 'rgba(37, 99, 235, 0.08)',
                border: '2px solid var(--brand-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-blue)',
                overflow: 'hidden',
                padding: (isEditing ? logo : currentCompany.logo) ? '4px' : '0',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                flexShrink: 0,
              }}
              title={name || 'Company Logo'}
            >
              {(isEditing ? logo : currentCompany.logo) ? (
                <img
                  src={isEditing ? logo : currentCompany.logo}
                  alt={name || 'Company Logo'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 size={36} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {name}
                </h1>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--brand-blue)',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {code}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    border: '1px solid var(--success-border)',
                  }}
                >
                  Active Entity
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {currentCompany.plan || 'Enterprise'} Plan
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={14} color="var(--brand-blue)" />
                  <a href={website} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 600 }}>
                    {website}
                  </a>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <Mail size={14} color="var(--text-muted)" /> {officialEmail}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} color="var(--text-muted)" /> {city}, {country}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} color="var(--text-muted)" /> Est. {incorporationDate}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LOCATIONS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{branches.length}</span>
              </div>
              <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HEADCOUNT</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-blue)' }}>{companyEmployees.length}</span>
              </div>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--brand-blue)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Save size={15} /> Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--brand-blue)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                }}
              >
                <Edit size={15} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Profile Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Section 1: Corporate Identity */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Building size={16} color="var(--brand-blue)" /> Corporate Identity & Branding
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Dedicated Company Logo Section */}
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ImageIcon size={15} color="var(--brand-blue)" /> Company Logo
                  </h4>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Official institution mark shown across the LMS header, profile summary card, and reports.
                  </p>
                </div>
                {isEditing && logo !== currentCompany.logo && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: 'var(--warning-bg)',
                      color: 'var(--warning)',
                      border: '1px solid var(--warning-border)',
                    }}
                  >
                    Unsaved Preview
                  </span>
                )}
              </div>

              {/* Logo Preview Box and Interactive Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Logo Preview Container */}
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '12px',
                    background: 'var(--bg-input)',
                    border: '2px dashed var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  title="Company Logo Preview"
                >
                  {(isEditing ? logo : currentCompany.logo) ? (
                    <img
                      src={isEditing ? logo : currentCompany.logo}
                      alt="Company Logo Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-placeholder)' }}>
                      <Building2 size={32} style={{ margin: '0 auto', opacity: 0.6 }} />
                      <span style={{ display: 'block', fontSize: '0.65rem', marginTop: '0.2rem', fontWeight: 600 }}>
                        No Logo
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls and Guidance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {isEditing ? (
                    <>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {logo ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoError(null);
                                setShowRemoveConfirm(false);
                                fileInputRef.current?.click();
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid var(--brand-blue)',
                                background: 'rgba(37, 99, 235, 0.08)',
                                color: 'var(--brand-blue)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <RefreshCw size={14} /> Change Logo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoError(null);
                                setShowRemoveConfirm(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid var(--danger-border)',
                                background: 'var(--bg-card)',
                                color: 'var(--danger)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={14} /> Remove Logo
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoError(null);
                              setShowRemoveConfirm(false);
                              fileInputRef.current?.click();
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--brand-blue)',
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                            }}
                          >
                            <Upload size={14} /> Upload Logo
                          </button>
                        )}
                      </div>

                      {/* Remove Confirmation Prompt */}
                      {showRemoveConfirm && (
                        <div
                          style={{
                            background: 'var(--danger-bg)',
                            border: '1px solid var(--danger-border)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                            Remove company logo? The default institutional icon will be displayed instead.
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setLogo('');
                                setShowRemoveConfirm(false);
                                setLogoError(null);
                                showToast('Company logo removed from preview. Click "Save Changes" to apply.', 'info');
                              }}
                              style={{
                                padding: '0.3rem 0.7rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'var(--danger)',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Yes, Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowRemoveConfirm(false)}
                              style={{
                                padding: '0.3rem 0.7rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Format and Size Guidance */}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        <span>Supported formats: <strong style={{ color: 'var(--text-secondary)' }}>PNG, JPG, SVG</strong></span>
                        <span style={{ margin: '0 0.35rem' }}>•</span>
                        <span>Max file size: <strong style={{ color: 'var(--text-secondary)' }}>2 MB</strong></span>
                      </div>

                      {/* Error Banner */}
                      {logoError && (
                        <div
                          style={{
                            color: 'var(--danger)',
                            background: 'var(--danger-bg)',
                            border: '1px solid var(--danger-border)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <AlertCircle size={14} style={{ flexShrink: 0 }} />
                          <span>{logoError}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {currentCompany.logo ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Custom logo active. Click "Edit Profile" above to change or remove.
                        </span>
                      ) : (
                        <span>
                          No custom logo uploaded. Default institutional icon is active. Click <strong style={{ color: 'var(--text-main)' }}>Edit Profile</strong> to upload an SVG, PNG, or JPG logo.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Legal Entity Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Trade / DBA Name
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Company Code <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ fontWeight: 700, color: 'var(--brand-blue)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Corporate Website URL
              </label>
              <input
                type="url"
                className="lms-form-input"
                readOnly={!isEditing}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Legal & Tax Identifiers */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ShieldCheck size={16} color="var(--brand-blue)" /> Legal & Tax Identifiers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Corporate Identification No. (CIN / Registration) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={cinNumber}
                onChange={(e) => setCinNumber(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Permanent Account No. (PAN / Tax ID) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  GSTIN / VAT ID
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Date of Incorporation
              </label>
              <input
                type="date"
                className="lms-form-input"
                readOnly={!isEditing}
                value={incorporationDate}
                onChange={(e) => setIncorporationDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Registered Office Address */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <MapPin size={16} color="var(--brand-blue)" /> Registered Office Address
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Street Address <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Suite / Floor / Unit
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={suite}
                onChange={(e) => setSuite(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  City <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  State / Region <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Postal Code <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Country <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Headquarters & Primary Office */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Building2 size={16} color="#d97706" /> Headquarters & Primary Office
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Designated operating headquarters referenced directly from Branches & Locations.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsHqModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Building2 size={13} color="#d97706" /> Change Headquarters
              </button>
            )}
          </div>

          {hqBranch ? (
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Headquarters / Office Name
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{hqBranch.name}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: 'rgba(217, 119, 6, 0.12)',
                      color: '#d97706',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                    }}
                  >
                    HQ
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Branch Code: <strong style={{ color: 'var(--text-main)' }}>{hqBranch.code}</strong>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Complete Address
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {hqBranch.address || 'Central Office Facility'}
                </div>
                {hqBranch.postalCode && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Postal Code: {hqBranch.postalCode}
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  City, State & Country
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {hqBranch.city}, {hqBranch.state ? `${hqBranch.state}, ` : ''}{hqBranch.country}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Timezone: {hqBranch.timezone || 'Asia/Kolkata (IST)'} &bull; Capacity: {hqBranch.capacity || 100} desks
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                border: '2px dashed var(--border-subtle)',
                borderRadius: '12px',
                background: 'var(--bg-card-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <Building2 size={24} style={{ margin: '0 auto 0.4rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>No Headquarters Designated</div>
              <p style={{ margin: '0.2rem 0 0.8rem', fontSize: '0.75rem' }}>
                Please designate one of the company's active branch locations as the official Headquarters.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsHqModalOpen(true)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--brand-blue)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  Designate Headquarters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Fiscal & Operational Parameters */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Clock size={16} color="var(--brand-blue)" /> Fiscal & Operational Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Base Currency <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ fontWeight: 700, color: 'var(--brand-blue)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Corporate Timezone <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lms-form-input"
                  readOnly={!isEditing}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Fiscal Year Cycle
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Standard Operating Work Week
              </label>
              <input
                type="text"
                className="lms-form-input"
                readOnly={!isEditing}
                value={workWeek}
                onChange={(e) => setWorkWeek(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Official Contact Information */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Mail size={16} color="var(--brand-blue)" /> Corporate Communications & Helpdesks
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Official Corporate Email
              </label>
              <input
                type="email"
                className="lms-form-input"
                readOnly={!isEditing}
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Primary Switchboard Phone
              </label>
              <input
                type="tel"
                className="lms-form-input"
                readOnly={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                People & HR Grievance Desk Email
              </label>
              <input
                type="email"
                className="lms-form-input"
                readOnly={!isEditing}
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Headquarters Selection Modal */}
      <HeadquartersSelectorModal
        isOpen={isHqModalOpen}
        onClose={() => setIsHqModalOpen(false)}
      />
    </div>
  );
};
