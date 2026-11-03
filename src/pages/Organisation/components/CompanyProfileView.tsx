import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { useAuthStore } from '../../../lib/store';
import { HeadquartersSelectorModal } from './HeadquartersSelectorModal';
import {
  Building2,
  MapPin,
  Clock,
  Edit3,
  Save,
  X,
  AlertCircle,
  Upload,
  Trash2,
  Camera,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export const CompanyProfileView: React.FC = () => {
  const { currentCompany, updateCompany, branches, showToast } = useHRMS();
  const { user } = useAuthStore();
  const isAdmin = true;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isHqModalOpen, setIsHqModalOpen] = useState<boolean>(false);

  // Headquarters from branches
  const hqBranch = useMemo(() => branches.find((b) => b.isHeadquarters), [branches]);

  // Clean currency helper
  const cleanCurrency = (val?: string) => {
    if (!val) return 'INR (â‚¹)';
    if (val.includes('INR') || val.includes('Ã£') || val.includes('Ã¢')) return 'INR (â‚¹)';
    return val;
  };

  // Form State
  const [name, setName] = useState<string>(currentCompany.name || '');
  const [tradeName, setTradeName] = useState<string>(currentCompany.tradeName || '');
  const [code, setCode] = useState<string>(currentCompany.code || '');
  const [website, setWebsite] = useState<string>(currentCompany.website || '');
  const [logo, setLogo] = useState<string>(currentCompany.logo || '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legal & Tax IDs
  const [cinNumber, setCinNumber] = useState<string>(currentCompany.cinNumber || '');
  const [taxId, setTaxId] = useState<string>(currentCompany.taxId || '');
  const [gstin, setGstin] = useState<string>(currentCompany.gstin || '');
  const [incorporationDate, setIncorporationDate] = useState<string>(
    currentCompany.incorporationDate || '2023-01-15'
  );

  // Registered Address
  const [streetAddress, setStreetAddress] = useState<string>(currentCompany.streetAddress || '');
  const [suite, setSuite] = useState<string>(currentCompany.suite || '');
  const [city, setCity] = useState<string>(currentCompany.city || 'Bengaluru');
  const [state, setState] = useState<string>(currentCompany.state || 'Karnataka');
  const [postalCode, setPostalCode] = useState<string>(currentCompany.postalCode || '560103');
  const [country, setCountry] = useState<string>(currentCompany.country || 'India');

  // Fiscal & Operations
  const [currency, setCurrency] = useState<string>(cleanCurrency(currentCompany.currency));
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
  const [officialEmail, setOfficialEmail] = useState<string>(currentCompany.officialEmail || '');
  const [phone, setPhone] = useState<string>(currentCompany.phone || '');
  const [hrEmail, setHrEmail] = useState<string>(currentCompany.hrEmail || '');

  // Validation error dictionary
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Refs for auto-focusing on first invalid field
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    code: useRef<HTMLInputElement>(null),
    officialEmail: useRef<HTMLInputElement>(null),
    cinNumber: useRef<HTMLInputElement>(null),
    taxId: useRef<HTMLInputElement>(null),
    streetAddress: useRef<HTMLInputElement>(null),
    city: useRef<HTMLInputElement>(null),
    state: useRef<HTMLInputElement>(null),
    postalCode: useRef<HTMLInputElement>(null),
    country: useRef<HTMLInputElement>(null),
    currency: useRef<HTMLInputElement>(null),
    timezone: useRef<HTMLInputElement>(null),
  };

  // Sync state with committed company
  useEffect(() => {
    if (!isEditing) {
      setName(currentCompany.name || '');
      setTradeName(currentCompany.tradeName || '');
      setCode(currentCompany.code || '');
      setWebsite(currentCompany.website || '');
      setLogo(currentCompany.logo || '');
      setCinNumber(currentCompany.cinNumber || '');
      setTaxId(currentCompany.taxId || '');
      setGstin(currentCompany.gstin || '');
      setIncorporationDate(currentCompany.incorporationDate || '2023-01-15');
      setStreetAddress(currentCompany.streetAddress || '');
      setSuite(currentCompany.suite || '');
      setCity(currentCompany.city || 'Bengaluru');
      setState(currentCompany.state || 'Karnataka');
      setPostalCode(currentCompany.postalCode || '560103');
      setCountry(currentCompany.country || 'India');
      setCurrency(cleanCurrency(currentCompany.currency));
      setTimezone(currentCompany.timezone || 'Asia/Kolkata (IST, UTC+5:30)');
      setFiscalYear(currentCompany.fiscalYear || 'April 1 - March 31');
      setWorkWeek(currentCompany.workWeek || 'Monday - Friday (5 Days)');
      setOfficialEmail(currentCompany.officialEmail || '');
      setPhone(currentCompany.phone || '');
      setHrEmail(currentCompany.hrEmail || '');
      setLogoError(null);
      setShowRemoveConfirm(false);
      setErrors({});
      setSaveErrorMessage(null);
    }
  }, [currentCompany, isEditing]);

  const clearFieldError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
    if (saveErrorMessage) setSaveErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);
    setShowRemoveConfirm(false);

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validMimeTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(ext)) {
      setLogoError('Please upload a PNG, JPG, or SVG image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setLogoError('Image size exceeds 2 MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogo(dataUrl);
        showToast('Logo updated. Click "Save Changes" to commit.', 'info');
      }
    };
    reader.onerror = () => {
      setLogoError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowRemoveConfirm(false);
    setLogoError(null);
    setErrors({});
    setSaveErrorMessage(null);

    setName(currentCompany.name || '');
    setTradeName(currentCompany.tradeName || '');
    setCode(currentCompany.code || '');
    setWebsite(currentCompany.website || '');
    setLogo(currentCompany.logo || '');
    setCinNumber(currentCompany.cinNumber || '');
    setTaxId(currentCompany.taxId || '');
    setGstin(currentCompany.gstin || '');
    setIncorporationDate(currentCompany.incorporationDate || '2023-01-15');
    setStreetAddress(currentCompany.streetAddress || '');
    setSuite(currentCompany.suite || '');
    setCity(currentCompany.city || 'Bengaluru');
    setState(currentCompany.state || 'Karnataka');
    setPostalCode(currentCompany.postalCode || '560103');
    setCountry(currentCompany.country || 'India');
    setCurrency(cleanCurrency(currentCompany.currency));
    setTimezone(currentCompany.timezone || 'Asia/Kolkata (IST, UTC+5:30)');
    setFiscalYear(currentCompany.fiscalYear || 'April 1 - March 31');
    setWorkWeek(currentCompany.workWeek || 'Monday - Friday (5 Days)');
    setOfficialEmail(currentCompany.officialEmail || '');
    setPhone(currentCompany.phone || '');
    setHrEmail(currentCompany.hrEmail || '');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Legal Entity Name is required';
    if (!code.trim()) newErrors.code = 'Company Code is required';
    if (!officialEmail.trim()) {
      newErrors.officialEmail = 'Official Corporate Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail.trim())) {
      newErrors.officialEmail = 'Enter a valid email address';
    }
    if (!cinNumber.trim()) newErrors.cinNumber = 'CIN / Registration No. is required';
    if (!taxId.trim()) newErrors.taxId = 'PAN / Tax ID is required';
    if (!streetAddress.trim()) newErrors.streetAddress = 'Street Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State / Region is required';
    if (!postalCode.trim()) newErrors.postalCode = 'Postal Code is required';
    if (!country.trim()) newErrors.country = 'Country is required';
    if (!currency.trim()) newErrors.currency = 'Base Currency is required';
    if (!timezone.trim()) newErrors.timezone = 'Corporate Timezone is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first erroneous field
      const firstKey = Object.keys(newErrors)[0] as keyof typeof fieldRefs;
      if (fieldRefs[firstKey]?.current) {
        fieldRefs[firstKey].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs[firstKey].current?.focus();
      }
      setSaveErrorMessage('Please correct the highlighted field(s) below.');
      return false;
    }

    setSaveErrorMessage(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      await updateCompany({
        name: name.trim(),
        tradeName: tradeName.trim(),
        code: code.trim(),
        website: website.trim(),
        logo,
        cinNumber: cinNumber.trim(),
        taxId: taxId.trim(),
        gstin: gstin.trim(),
        incorporationDate,
        streetAddress: streetAddress.trim(),
        suite: suite.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
        fiscalYear: fiscalYear.trim(),
        workWeek: workWeek.trim(),
        officialEmail: officialEmail.trim(),
        phone: phone.trim(),
        hrEmail: hrEmail.trim(),
      });

      setIsEditing(false);
      setShowRemoveConfirm(false);
      setLogoError(null);
      setErrors({});
      setSaveErrorMessage(null);
      showToast('Company Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to update company:', err);
      const msg = err.message || 'Failed to save changes. Please check server connection.';
      setSaveErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reusable input component helper
  const renderField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    fieldKey: keyof typeof fieldRefs | string,
    options?: {
      required?: boolean;
      type?: string;
      placeholder?: string;
      ref?: React.RefObject<HTMLInputElement | null>;
      span?: number;
      customStyle?: React.CSSProperties;
    }
  ) => {
    const fieldError = errors[fieldKey];
    const isRequired = !!options?.required;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          gridColumn: options?.span ? `span ${options.span}` : undefined,
        }}
      >
        <label
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: fieldError ? '#ef4444' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease',
          }}
        >
          {label}
          {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </label>

        <input
          ref={options?.ref as any}
          type={options?.type || 'text'}
          readOnly={!isEditing}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            clearFieldError(fieldKey);
          }}
          placeholder={options?.placeholder || ''}
          style={{
            width: '100%',
            height: '42px',
            boxSizing: 'border-box',
            borderRadius: '8px',
            border: fieldError
              ? '1.5px solid #ef4444'
              : isEditing
              ? '1px solid rgba(255, 255, 255, 0.14)'
              : '1px solid rgba(255, 255, 255, 0.07)',
            background: fieldError
              ? 'rgba(239, 68, 68, 0.08)'
              : isEditing
              ? 'rgba(15, 23, 42, 0.75)'
              : 'rgba(15, 23, 42, 0.35)',
            boxShadow: fieldError
              ? '0 0 0 3px rgba(239, 68, 68, 0.2)'
              : 'none',
            color: '#f8fafc',
            fontSize: '0.875rem',
            padding: '0 14px',
            outline: 'none',
            transition: 'all 0.15s ease',
            cursor: isEditing ? 'text' : 'default',
            ...options?.customStyle,
          }}
        />

        {fieldError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 500,
              marginTop: '2px',
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>{fieldError}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Global Validation Error Banner */}
      {saveErrorMessage && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '12px 18px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', fontWeight: 600 }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{saveErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveErrorMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Single Clean Unified Box (Matching Reference Image 3) */}
      <div
        style={{
          background: 'var(--bg-card, #0d111c)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '26px',
        }}
      >
        {/* Top Header Bar: Clean Title & Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '6px',
          }}
        >
          {/* Header Left: Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                flexShrink: 0,
              }}
            >
              <Building2 size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Company Details
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  Active Entity
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {currentCompany.plan || 'Enterprise'} Plan
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                Registration Date &bull; {incorporationDate || 'N/A'}
              </span>
            </div>
          </div>

          {/* Header Right: Edit / Save / Cancel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <X size={15} /> Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    transition: 'all 0.15s ease',
                    opacity: isSaving ? 0.75 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Edit3 size={15} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Core Profile (Circular Avatar on Left + Clean 3-Column Grid on Right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '32px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Column: Clean Circular Profile / Logo Avatar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              minWidth: '120px',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              Profile
            </span>

            {/* Circular Avatar */}
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: (isEditing ? logo : currentCompany.logo)
                  ? '2px solid rgba(99, 102, 241, 0.5)'
                  : '2px dashed rgba(255, 255, 255, 0.2)',
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                padding: (isEditing ? logo : currentCompany.logo) ? '6px' : '0',
              }}
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
                    borderRadius: '50%',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Building2 size={36} style={{ margin: '0 auto', opacity: 0.6 }} />
                </div>
              )}

              {/* Edit Mode Camera Icon Overlay */}
              {isEditing && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change logo"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: 0.85,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Camera size={20} color="#ffffff" />
                  <span style={{ fontSize: '0.65rem', color: '#ffffff', marginTop: '2px', fontWeight: 600 }}>
                    {logo ? 'Change' : 'Upload'}
                  </span>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Edit Mode Avatar Buttons */}
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#818cf8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={12} /> {logo ? 'Change' : 'Upload'}
                  </button>

                  {logo && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                {showRemoveConfirm && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '0.7rem',
                      color: '#fca5a5',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span>Remove logo?</span>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setLogo('');
                          setShowRemoveConfirm(false);
                          showToast('Logo removed preview.', 'info');
                        }}
                        style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRemoveConfirm(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#e2e8f0',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {logoError && (
                  <span style={{ fontSize: '0.7rem', color: '#f87171', textAlign: 'center' }}>
                    {logoError}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Clean 3-Column Inputs Grid */}
          <div
            style={{
              flex: 1,
              minWidth: '320px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px 20px',
            }}
          >
            {/* Row 1 */}
            {renderField('Legal Entity Name', name, setName, 'name', {
              required: true,
              placeholder: 'RAPA TECH',
              ref: fieldRefs.name,
            })}

            {renderField('Trade / DBA Name', tradeName, setTradeName, 'tradeName', {
              placeholder: 'RAPA',
            })}

            {renderField('Primary Switchboard Phone', phone, setPhone, 'phone', {
              type: 'tel',
              placeholder: '+91 9999999999',
            })}

            {/* Row 2 */}
            {renderField('Official Corporate Email', officialEmail, setOfficialEmail, 'officialEmail', {
              required: true,
              type: 'email',
              placeholder: 'contact@company.com',
              ref: fieldRefs.officialEmail,
            })}

            {renderField('Date of Incorporation', incorporationDate, setIncorporationDate, 'incorporationDate', {
              type: 'date',
            })}

            {renderField('Company Code', code, (v) => setCode(v.toUpperCase()), 'code', {
              required: true,
              placeholder: '001',
              ref: fieldRefs.code,
              customStyle: { fontWeight: 700, color: '#818cf8' },
            })}

            {/* Row 3 */}
            {renderField('Corporate Website URL', website, setWebsite, 'website', {
              type: 'url',
              placeholder: 'https://www.company.com',
            })}

            {renderField('People & HR Grievance Email', hrEmail, setHrEmail, 'hrEmail', {
              type: 'email',
              placeholder: 'hr@company.com',
            })}

            {renderField('Corporate Timezone', timezone, setTimezone, 'timezone', {
              required: true,
              placeholder: 'Asia/Kolkata (IST, UTC+5:30)',
              ref: fieldRefs.timezone,
            })}

            {/* Row 4 */}
            {renderField('CIN / Registration No.', cinNumber, setCinNumber, 'cinNumber', {
              required: true,
              placeholder: 'e.g. U72200KA2023PTC123456',
              ref: fieldRefs.cinNumber,
            })}

            {renderField('PAN / Tax ID', taxId, setTaxId, 'taxId', {
              required: true,
              placeholder: 'e.g. AABCV1234F',
              ref: fieldRefs.taxId,
            })}

            {renderField('GSTIN / VAT ID', gstin, setGstin, 'gstin', {
              placeholder: 'e.g. 29AABCV1234F1Z5',
            })}
          </div>
        </div>

        {/* Section Divider */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

        {/* Section 2: Registered Office Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <MapPin size={17} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Registered Office Address
            </h3>
          </div>

          {/* Address Grid: 3 Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px 20px',
            }}
          >
            {renderField('Street Address', streetAddress, setStreetAddress, 'streetAddress', {
              required: true,
              placeholder: 'samatha nagar 3rd line ongole',
              span: 2,
              ref: fieldRefs.streetAddress,
            })}

            {renderField('Suite / Floor / Unit', suite, setSuite, 'suite', {
              placeholder: 'e.g. Suite 402, Level 4',
            })}

            {renderField('City', city, setCity, 'city', {
              required: true,
              placeholder: 'Bengaluru',
              ref: fieldRefs.city,
            })}

            {renderField('State / Region', state, setState, 'state', {
              required: true,
              placeholder: 'Karnataka',
              ref: fieldRefs.state,
            })}

            {renderField('Postal Code', postalCode, setPostalCode, 'postalCode', {
              required: true,
              placeholder: '560103',
              ref: fieldRefs.postalCode,
            })}

            {renderField('Country', country, setCountry, 'country', {
              required: true,
              placeholder: 'India',
              ref: fieldRefs.country,
            })}
          </div>
        </div>

        {/* Section Divider */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

        {/* Section 3: Fiscal, Operational & Headquarters Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Clock size={17} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Fiscal, Operational & Headquarters Settings
              </h3>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsHqModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                  background: 'rgba(217, 119, 6, 0.12)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Building2 size={13} color="#fbbf24" />
                {hqBranch ? 'Change Headquarters' : 'Designate Headquarters'}
              </button>
            )}
          </div>

          {/* Operational Grid: 3 Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px 20px',
            }}
          >
            {renderField('Base Currency', currency, setCurrency, 'currency', {
              required: true,
              placeholder: 'INR (â‚¹)',
              ref: fieldRefs.currency,
              customStyle: { fontWeight: 700, color: '#818cf8' },
            })}

            {renderField('Fiscal Year Cycle', fiscalYear, setFiscalYear, 'fiscalYear', {
              placeholder: 'April 1 - March 31',
            })}

            {renderField('Standard Operating Work Week', workWeek, setWorkWeek, 'workWeek', {
              placeholder: 'Monday - Friday (5 Days)',
            })}

            {/* Operating Headquarters Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                Operating Headquarters
              </label>
              <div
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.45)',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                {hqBranch ? (
                  <>
                    <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                      {hqBranch.name} ({hqBranch.city}, {hqBranch.country})
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(217, 119, 6, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(217, 119, 6, 0.3)',
                      }}
                    >
                      HQ
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    No Headquarters Designated
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Headquarters Selection Modal */}
      <HeadquartersSelectorModal
        isOpen={isHqModalOpen}
        onClose={() => setIsHqModalOpen(false)}
      />
    </div>
  );
};
