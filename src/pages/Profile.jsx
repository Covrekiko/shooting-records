import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Settings, FileText, LogOut, BarChart3, Map, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Profile() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    setLoading(true);
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-48">
            <div className="space-y-2">
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <User className="w-5 h-5" />
                My Details
              </Link>
              <Link
                to="/profile/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/profile/settings')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <Link
                to="/records"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/profile/records')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <FileText className="w-5 h-5" />
                Records
              </Link>
              <Link
                to="/reports"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/reports')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                Reports
              </Link>
              <Link
                to="/deer-stalking-logs"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/deer-stalking-logs')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Map className="w-5 h-5" />
                Stalking Logs
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-5 h-5" />
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isActive('/profile/settings') ? (
              <SettingsPanel />
            ) : (
              <PersonalDetailsPanel />
            )}
          </div>
        </div>
      </main>
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
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
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
    </div>
  );
}

function SettingCard({ title, description, link }) {
  return (
    <Link to={link} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all hover:border-primary">
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
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Personal Details</h3>
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
        </div>

        {/* Address */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Address</h3>
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
        </div>

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
    </div>
  );
}