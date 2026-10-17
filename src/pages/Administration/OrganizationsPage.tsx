import React, { useState } from 'react';
import { mockOrganizations } from '../../data/mockData';
import { Organization } from '../../types';
import {
  Building2, Plus, Search, Edit2, Archive, Globe, Clock,
  Users, CheckCircle2, X, ExternalLink, Settings
} from 'lucide-react';

export const OrganizationsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>(mockOrganizations);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [locale, setLocale] = useState('en-US');

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setIsEditing(false);
    setName('');
    setSlug('');
    setContactEmail('');
    setTimezone('America/New_York');
    setLocale('en-US');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setIsEditing(true);
    setSelectedOrg(org);
    setName(org.name);
    setSlug(org.slug);
    setContactEmail(org.contactEmail);
    setTimezone(org.timezone);
    setLocale(org.locale);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedOrg) {
      setOrgs(orgs.map((o) => o.id === selectedOrg.id ? {
        ...o, name, slug, contactEmail, timezone, locale, updatedAt: new Date().toISOString()
      } : o));
    } else {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name,
        slug,
        contactEmail,
        timezone,
        locale,
        status: 'active',
        settings: { gamification: true, proctoring: true, aiAssistant: true },
        userCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setOrgs([newOrg, ...orgs]);
    }
    setIsModalOpen(false);
  };

  const handleArchive = (id: string) => {
    if (confirm('Are you sure you want to archive this organization? All active sessions and enrollments will be suspended.')) {
      setOrgs(orgs.map((o) => o.id === id ? { ...o, status: 'archived' } : o));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Multi-Tenant Organizations</h1>
          <p className="text-secondary text-sm">Platform Admin tenant management, data boundaries, and global organizational settings</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add Organization
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search organizations by name or slug identifier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <span className="text-muted text-xs font-semibold">{filteredOrgs.length} Organizations</span>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Tenant Code (Slug)</th>
              <th>Contact Email</th>
              <th>Locale / Timezone</th>
              <th>Total Users</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.map((org) => (
              <tr key={org.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{org.name}</div>
                      <div className="text-muted text-xs">Created: {new Date(org.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {org.slug}
                  </code>
                </td>
                <td>{org.contactEmail}</td>
                <td>
                  <div className="text-sm">{org.locale}</div>
                  <div className="text-muted text-xs">{org.timezone}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{org.userCount.toLocaleString()}</span> users
                </td>
                <td>
                  <span className={`badge badge-${org.status}`}>{org.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(org)}
                      title="Edit organization profile"
                    >
                      <Edit2 size={14} />
                    </button>
                    {org.status !== 'archived' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleArchive(org.id)}
                        style={{ color: 'var(--danger)' }}
                        title="Archive tenant"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {isEditing ? 'Edit Organization' : 'Create New Tenant Organization'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Organization Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Academy"
                    className="form-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!isEditing) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tenant Slug / Domain Identifier <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. apex-academy"
                    className="form-input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <span className="form-helper">Used for dedicated tenant isolation subdomain routing</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email <span className="required">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="admin@organization.com"
                    className="form-input"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Default Locale</label>
                    <select className="form-select" value={locale} onChange={(e) => setLocale(e.target.value)}>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
