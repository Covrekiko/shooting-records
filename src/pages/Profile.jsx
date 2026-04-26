import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Settings, FileText, LogOut, BarChart3, Map, User, ChevronDown, ChevronRight, Trash2, Zap, Layers } from 'lucide-react';
import AutoCheckinSettingToggle from '@/components/AutoCheckinSettingToggle';
import { base44 } from '@/api/base44Client';
import { T } from '@/lib/theme';

const sidebarLink = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.625rem 0.75rem',
  borderRadius: '0.75rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.15s',
  color: active ? T.bg : T.muted,
  background: active ? T.bronze : 'transparent',
  textDecoration: 'none',
});

export default function Profile() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  const navItems = [
    { path: '/profile', label: 'My Details', icon: User },
    { path: '/profile/settings', label: 'Equipment & Areas', icon: Settings },
    { path: '/records', label: 'Records', icon: FileText },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/ammo-summary', label: 'Armory Status', icon: Zap },
    { path: '/deer-stalking-logs', label: 'Stalking Logs', icon: Map },
    { path: '/profile/modules', label: 'App Modules', icon: Layers },
  ];

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <Navigation />
      <main className="max-w-5xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <h1 className="text-xl font-bold mb-4 hidden md:block" style={{ color: T.text }}>Profile</h1>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Sidebar */}
          <div className="w-full md:w-52">
            <div className="rounded-2xl p-2 space-y-0.5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path} style={sidebarLink(isActive(path))}>
                  <Icon className="w-4 h-4" style={{ color: isActive(path) ? T.bg : T.bronze }} />
                  {label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: T.danger }}
              >
                <LogOut className="w-4 h-4" />
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              {isActive('/profile/settings') ? (
                <SettingsPanel />
              ) : (
                <PersonalDetailsPanel />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ color: T.muted }}
      >
        <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: T.bronze }}>{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4" style={{ color: T.muted }} />
          : <ChevronRight className="w-4 h-4" style={{ color: T.muted }} />
        }
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: T.muted }}>
        {label}{required && <span className="ml-1" style={{ color: T.danger }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: T.danger }}>{error}</p>}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: T.text }}>Equipment & Areas</h2>
        <p className="text-sm" style={{ color: T.muted }}>Manage your firearms and locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Rifles', description: 'Manage your rifle collection', link: '/settings/rifles' },
          { title: 'Shotguns', description: 'Manage your shotgun collection', link: '/settings/shotguns' },
          { title: 'Clubs', description: 'Manage shooting clubs', link: '/settings/clubs' },
          { title: 'Deer Locations', description: 'Manage deer hunting locations', link: '/settings/locations' },
          { title: 'Ammunition', description: 'Manage ammunition', link: '/settings/ammunition' },
          { title: 'Ammunition Inventory', description: 'Track stock levels & costs', link: '/settings/ammunition-inventory' },
        ].map(({ title, description, link }) => (
          <Link key={link} to={link}
            className="block rounded-xl p-4 transition-all active:scale-[0.98]"
            style={{ background: T.panel, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.bronze}` }}
          >
            <h3 className="text-sm font-bold mb-1" style={{ color: T.text }}>{title}</h3>
            <p className="text-xs" style={{ color: T.muted }}>{description}</p>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: T.bronze }}>App Settings</h3>
        <AutoCheckinSettingToggle />
      </div>
    </div>
  );
}

const COUNTRIES = [
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Ireland',
  'New Zealand', 'South Africa', 'France', 'Germany', 'Spain',
  'Italy', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark', 'Other'
];

const tacInputClass = (hasError) => ({
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: `1px solid ${hasError ? T.danger : T.border}`,
  borderRadius: '0.75rem',
  background: T.bg,
  color: T.text,
  fontSize: '0.875rem',
  outline: 'none',
});

function PersonalDetailsPanel() {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setForm({
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        dateOfBirth: user.dateOfBirth || '',
        addressLine1: user.addressLine1 || '',
        addressLine2: user.addressLine2 || '',
        city: user.city || '',
        postcode: user.postcode || '',
        country: user.country || 'United Kingdom',
        phone: user.phone || '',
      });
    });
  }, []);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    setSaved(false);
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Surname is required';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Address is required';
    if (!form.dateOfBirth) {
      e.dateOfBirth = 'Date of birth is required';
    } else {
      const today = new Date();
      const birth = new Date(form.dateOfBirth);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (isNaN(age) || age < 0 || age > 120) e.dateOfBirth = 'Please enter a valid date of birth';
      else if (age < 14) e.dateOfBirth = 'You must be at least 14 years old';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    await base44.auth.updateMe({ ...form, profileComplete: true });
    setSaving(false);
    setSaved(true);
  };

  if (!form) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${T.bronze} transparent ${T.bronze} ${T.bronze}` }} />
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: T.text }}>My Details</h2>
      <p className="text-sm mb-6" style={{ color: T.muted }}>Update your personal information below.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CollapsibleSection title="Personal Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'firstName', label: 'First Name', type: 'text', placeholder: 'First name', required: true },
              { key: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Optional' },
              { key: 'lastName', label: 'Surname / Last Name', type: 'text', placeholder: 'Last name', required: true },
              { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
              { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. 07700 900000' },
            ].map(({ key, label, type, placeholder, required }) => (
              <Field key={key} label={label} error={errors[key]} required={required}>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  max={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
                  style={tacInputClass(!!errors[key])}
                />
              </Field>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Address">
          <div className="space-y-4">
            <Field label="Address Line 1" error={errors.addressLine1} required>
              <input type="text" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="e.g. 12 High Street" style={tacInputClass(!!errors.addressLine1)} />
            </Field>
            <Field label="Address Line 2" error={errors.addressLine2}>
              <input type="text" value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="Flat, suite (optional)" style={tacInputClass(false)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City / Town" error={errors.city}>
                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. London" style={tacInputClass(false)} />
              </Field>
              <Field label="Postcode" error={errors.postcode}>
                <input type="text" value={form.postcode} onChange={e => set('postcode', e.target.value.toUpperCase())} placeholder="e.g. SW1A 1AA" style={tacInputClass(false)} />
              </Field>
              <Field label="Country" error={errors.country}>
                <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...tacInputClass(false), cursor: 'pointer' }}>
                  {COUNTRIES.map(c => <option key={c} value={c} style={{ background: T.panel }}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </CollapsibleSection>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
            style={{ background: T.bronze, color: T.bg }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm font-medium" style={{ color: T.success }}>✓ Saved successfully</span>}
        </div>
      </form>

      <DeleteAccountSection />
    </div>
  );
}

function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await base44.auth.updateMe({ accountDeleteRequested: true, accountDeleteRequestedAt: new Date().toISOString() });
      await base44.auth.logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 rounded-xl p-5" style={{ border: `1px solid ${T.danger}40`, background: `${T.danger}08` }}>
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: T.danger }}>
        <Trash2 className="w-4 h-4" /> Delete Account
      </h3>
      <p className="text-sm mb-4" style={{ color: T.muted }}>
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ border: `1px solid ${T.danger}`, color: T.danger, background: 'transparent' }}
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: T.text }}>Type <strong style={{ color: T.danger }}>DELETE</strong> to confirm:</p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            style={{ ...tacInputClass(false), border: `1px solid ${T.danger}` }}
          />
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
              style={{ background: T.danger, color: T.text }}
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => { setConfirming(false); setConfirmText(''); }}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{ border: `1px solid ${T.border}`, color: T.muted, background: 'transparent' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}