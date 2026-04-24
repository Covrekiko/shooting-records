import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Settings, FileText, LogOut, BarChart3, Map, User, ChevronDown, ChevronRight, Trash2, Zap } from 'lucide-react';
import AutoCheckinSettingToggle from '@/components/AutoCheckinSettingToggle';
import { base44 } from '@/api/base44Client';
import { DESIGN } from '@/lib/designConstants';

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

  return (
    <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
      <Navigation />
      <main className="max-w-5xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <h1 className="text-xl font-bold mb-4 hidden md:block text-slate-900 dark:text-slate-100">Profile</h1>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Sidebar */}
          <div className="w-full md:w-52">
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm p-2 space-y-0.5">
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <User className="w-4 h-4" />
                My Details
              </Link>
              <Link
                to="/profile/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/profile/settings')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                Equipment & Areas
              </Link>
              <Link
                to="/records"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/profile/records')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Records
              </Link>
              <Link
                to="/reports"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/reports')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Reports
              </Link>
              <Link
                to="/ammo-summary"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/ammo-summary')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Zap className="w-4 h-4" />
                Armory Status
              </Link>
              <Link
                to="/deer-stalking-logs"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/deer-stalking-logs')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Map className="w-4 h-4" />
                Stalking Logs
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm p-5">
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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Equipment & Areas</h2>
        <p className="text-muted-foreground">Manage your firearms and locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingCard title="Rifles" description="Manage your rifle collection" link="/settings/rifles" />
        <SettingCard title="Shotguns" description="Manage your shotgun collection" link="/settings/shotguns" />
        <SettingCard title="Clubs" description="Manage shooting clubs" link="/settings/clubs" />
        <SettingCard title="Deer Locations" description="Manage deer hunting locations" link="/settings/locations" />
        <SettingCard title="Ammunition" description="Manage ammunition" link="/settings/ammunition" />
        <SettingCard title="Ammunition Inventory" description="Track stock levels & costs" link="/settings/ammunition-inventory" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">App Settings</h3>
        <AutoCheckinSettingToggle />
      </div>
    </div>
  );
}

function SettingCard({ title, description, link }) {
  return (
    <Link to={link} className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md transition-all block shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function RecordsPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Records</h2>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">View and manage all your shooting records</p>
        <Link to="/records" className="mt-4 inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          View All Records
        </Link>
      </div>
    </div>
  );
}

const COUNTRIES = [
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Ireland',
  'New Zealand', 'South Africa', 'France', 'Germany', 'Spain',
  'Italy', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
  'Other'
];

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

  if (!form) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
      errors[field] ? 'border-destructive' : 'border-border'
    }`;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">My Details</h2>
      <p className="text-muted-foreground text-sm mb-6">Update your personal information below.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal */}
        <CollapsibleSection title="Personal Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" error={errors.firstName} required>
              <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" className={inputClass('firstName')} autoComplete="given-name" />
            </Field>
            <Field label="Middle Name" error={errors.middleName}>
              <input type="text" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Optional" className={inputClass('middleName')} autoComplete="additional-name" />
            </Field>
            <Field label="Surname / Last Name" error={errors.lastName} required>
              <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" className={inputClass('lastName')} autoComplete="family-name" />
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth} required>
              <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass('dateOfBirth')} autoComplete="bday" />
            </Field>
            <Field label="Phone Number" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 07700 900000" className={inputClass('phone')} autoComplete="tel" />
            </Field>
          </div>
        </CollapsibleSection>

        {/* Address */}
        <CollapsibleSection title="Address">
          <div className="space-y-4">
            <Field label="Address Line 1" error={errors.addressLine1} required>
              <input type="text" value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="e.g. 12 High Street" className={inputClass('addressLine1')} autoComplete="address-line1" />
            </Field>
            <Field label="Address Line 2" error={errors.addressLine2}>
              <input type="text" value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="Flat, suite (optional)" className={inputClass('addressLine2')} autoComplete="address-line2" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City / Town" error={errors.city}>
                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. London" className={inputClass('city')} autoComplete="address-level2" />
              </Field>
              <Field label="Postcode" error={errors.postcode}>
                <input type="text" value={form.postcode} onChange={e => set('postcode', e.target.value.toUpperCase())} placeholder="e.g. SW1A 1AA" className={inputClass('postcode')} autoComplete="postal-code" />
              </Field>
              <Field label="Country" error={errors.country}>
                <select value={form.country} onChange={e => set('country', e.target.value)} className={inputClass('country')} autoComplete="country-name">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </CollapsibleSection>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved successfully</span>}
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
    <div className="mt-10 border border-destructive/30 rounded-xl p-5 bg-destructive/5">
      <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> Delete Account
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">Type <strong>DELETE</strong> to confirm:</p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-destructive rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
          />
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => { setConfirming(false); setConfirmText(''); }}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}