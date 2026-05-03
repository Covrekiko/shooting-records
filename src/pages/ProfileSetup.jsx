import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottomSheetSelect from '@/components/BottomSheetSelect';

const COUNTRIES = [
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Ireland',
  'New Zealand', 'South Africa', 'France', 'Germany', 'Spain',
  'Italy', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
  'Other'
];

function getAge(dob) {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ProfileSetup({ onComplete }) {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Surname is required';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Address is required';
    if (!privacyAgreed) e.privacyAgreed = 'Please agree to the Privacy Policy';
    if (!form.dateOfBirth) {
      e.dateOfBirth = 'Date of birth is required';
    } else {
      const age = getAge(form.dateOfBirth);
      if (isNaN(age) || age < 0) e.dateOfBirth = 'Please enter a valid date of birth';
      else if (age < 14) e.dateOfBirth = 'You must be at least 14 years old';
      else if (age > 120) e.dateOfBirth = 'Please enter a valid date of birth';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({
      ...form,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      city: form.city.trim(),
      postcode: form.postcode.trim(),
      phone: form.phone.trim(),
      profileComplete: true,
    });
    setSaving(false);
    onComplete();
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
      errors[field] ? 'border-destructive' : 'border-border'
    }`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            Please fill in your personal details to get started. Fields marked <span className="text-destructive">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 space-y-6">

          {/* Personal Details */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border">
              Personal Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName} required>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="e.g. John"
                  className={inputClass('firstName')}
                  autoComplete="given-name"
                />
              </Field>

              <Field label="Middle Name" error={errors.middleName}>
                <input
                  type="text"
                  value={form.middleName}
                  onChange={e => set('middleName', e.target.value)}
                  placeholder="Optional"
                  className={inputClass('middleName')}
                  autoComplete="additional-name"
                />
              </Field>

              <Field label="Surname / Last Name" error={errors.lastName} required>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  placeholder="e.g. Smith"
                  className={inputClass('lastName')}
                  autoComplete="family-name"
                />
              </Field>

              <Field label="Date of Birth" error={errors.dateOfBirth} required>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass('dateOfBirth')}
                  autoComplete="bday"
                />
              </Field>

              <Field label="Phone Number" error={errors.phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. 07700 900000"
                  className={inputClass('phone')}
                  autoComplete="tel"
                />
              </Field>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border">
              Address
            </h2>
            <div className="space-y-4">
              <Field label="Address Line 1" error={errors.addressLine1} required>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={e => set('addressLine1', e.target.value)}
                  placeholder="e.g. 12 High Street"
                  className={inputClass('addressLine1')}
                  autoComplete="address-line1"
                />
              </Field>

              <Field label="Address Line 2" error={errors.addressLine2}>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={e => set('addressLine2', e.target.value)}
                  placeholder="Flat, apartment, suite (optional)"
                  className={inputClass('addressLine2')}
                  autoComplete="address-line2"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Field label="City / Town" error={errors.city}>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="e.g. London"
                      className={inputClass('city')}
                      autoComplete="address-level2"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-1">
                  <Field label="Postcode" error={errors.postcode}>
                    <input
                      type="text"
                      value={form.postcode}
                      onChange={e => set('postcode', e.target.value.toUpperCase())}
                      placeholder="e.g. SW1A 1AA"
                      className={inputClass('postcode')}
                      autoComplete="postal-code"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-1">
                  <Field label="Country" error={errors.country}>
                    <BottomSheetSelect
                      value={form.country}
                      onChange={(val) => set('country', val)}
                      placeholder="Select country"
                      options={COUNTRIES.map(c => ({ value: c, label: c }))}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => {
                  setPrivacyAgreed(e.target.checked);
                  if (errors.privacyAgreed) setErrors(prev => ({ ...prev, privacyAgreed: null }));
                }}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                I agree to the <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>
            {errors.privacyAgreed && <p className="text-destructive text-xs mt-1">{errors.privacyAgreed}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {saving ? 'Saving...' : 'Complete Registration →'}
          </button>
        </form>
      </div>
    </div>
  );
}