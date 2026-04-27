import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STEPS = [
  { id: 'account', label: 'Account & Role' },
  { id: 'personal', label: 'Personal Details' },
  { id: 'address', label: 'Address' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'beta', label: 'Beta Tester' },
];

export default function CreateUserForm({ onSuccess, onCancel, user }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    tempPassword: '',
    confirmPassword: '',
    role: 'normal_user',
    status: 'active',
    forcePasswordChange: false,
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
    country: '',
    facNumber: '',
    shotgunCertificate: '',
    certificateExpiryDate: '',
    dscLevel: '',
    betaTesterNotes: '',
    betaTesterStatus: 'active',
    betaTesterExpiresAt: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = () => {
    setError('');

    if (step === 0) {
      // Account & Role validation
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Invalid email format');
        return false;
      }
      if (!formData.tempPassword) {
        setError('Temporary password is required');
        return false;
      }
      if (formData.tempPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return false;
      }
      if (formData.tempPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (!['admin', 'normal_user', 'beta_tester'].includes(formData.role)) {
        setError('Invalid role selected');
        return false;
      }
    } else if (step === 1) {
      // Personal Details validation
      if (!formData.firstName.trim()) {
        setError('First name is required');
        return false;
      }
      if (!formData.lastName.trim()) {
        setError('Last name is required');
        return false;
      }
      if (!formData.dateOfBirth) {
        setError('Date of birth is required');
        return false;
      }
      const dob = new Date(formData.dateOfBirth);
      if (dob > new Date()) {
        setError('Date of birth cannot be in the future');
        return false;
      }
    } else if (step === 2) {
      // Address validation
      if (!formData.addressLine1.trim()) {
        setError('Address line 1 is required');
        return false;
      }
      if (!formData.city.trim()) {
        setError('City is required');
        return false;
      }
      if (!formData.postcode.trim()) {
        setError('Postcode is required');
        return false;
      }
      if (!formData.country.trim()) {
        setError('Country is required');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      // Skip beta step if not beta tester
      if (step === 3 && formData.role !== 'beta_tester') {
        setStep(5); // Skip to end
      } else {
        setStep(step + 1);
      }
    }
  };

  const handlePrev = () => {
    if (step === 5 && formData.role !== 'beta_tester') {
      setStep(3); // Skip back to certificates
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    try {
      const res = await base44.functions.invoke('createUserWithProfile', {
        email: formData.email,
        tempPassword: formData.tempPassword,
        role: formData.role,
        status: formData.status,
        forcePasswordChange: formData.forcePasswordChange,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        county: formData.county,
        postcode: formData.postcode,
        country: formData.country,
        facNumber: formData.facNumber,
        shotgunCertificate: formData.shotgunCertificate,
        certificateExpiryDate: formData.certificateExpiryDate,
        dscLevel: formData.dscLevel,
        betaTesterNotes: formData.betaTesterNotes,
        betaTesterStatus: formData.betaTesterStatus,
        betaTesterExpiresAt: formData.betaTesterExpiresAt,
      });

      if (res.data.success) {
        onSuccess(res.data);
      } else {
        setError(res.data.error || 'Failed to create user');
      }
    } catch (err) {
      setError(err.message || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const stepNum = step === 5 ? STEPS.length - 1 : step;
  const isLastStep = step === STEPS.length - 1 || (step === 3 && formData.role !== 'beta_tester');
  const showBetaStep = formData.role === 'beta_tester';

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Create New User</h2>
        <p className="text-sm text-muted-foreground">Step {stepNum + 1} of {showBetaStep ? STEPS.length : STEPS.length - 1}: {STEPS[stepNum]?.label}</p>
        <div className="flex gap-1 mt-3">
          {(showBetaStep ? STEPS : STEPS.slice(0, -1)).map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepNum ? 'bg-primary' : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ACCOUNT & ROLE */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">User Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              >
                <option value="normal_user">Normal User</option>
                <option value="beta_tester">Beta Tester</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Temporary Password *</label>
              <input
                type="password"
                value={formData.tempPassword}
                onChange={(e) => handleChange('tempPassword', e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.forcePasswordChange}
                onChange={(e) => handleChange('forcePasswordChange', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-foreground font-medium">Force password change on first login</span>
            </label>
          </div>
        )}

        {/* PERSONAL DETAILS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Surname / Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Date of Birth *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>
          </div>
        )}

        {/* ADDRESS */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Address Line 1 *</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Town / City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">County</label>
                <input
                  type="text"
                  value={formData.county}
                  onChange={(e) => handleChange('county', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Postcode *</label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => handleChange('postcode', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* CERTIFICATES */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">FAC Number</label>
              <input
                type="text"
                value={formData.facNumber}
                onChange={(e) => handleChange('facNumber', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Shotgun Certificate Number</label>
              <input
                type="text"
                value={formData.shotgunCertificate}
                onChange={(e) => handleChange('shotgunCertificate', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Certificate Expiry Date</label>
              <input
                type="date"
                value={formData.certificateExpiryDate}
                onChange={(e) => handleChange('certificateExpiryDate', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Deerstalking Certificate Level</label>
              <select
                value={formData.dscLevel}
                onChange={(e) => handleChange('dscLevel', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              >
                <option value="">None</option>
                <option value="DSC1">DSC1</option>
                <option value="DSC2">DSC2</option>
                <option value="PDS1">PDS1</option>
              </select>
            </div>
          </div>
        )}

        {/* BETA TESTER */}
        {step === 4 && formData.role === 'beta_tester' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Beta Tester Status</label>
              <select
                value={formData.betaTesterStatus}
                onChange={(e) => handleChange('betaTesterStatus', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Beta Tester Notes</label>
              <textarea
                value={formData.betaTesterNotes}
                onChange={(e) => handleChange('betaTesterNotes', e.target.value)}
                placeholder="Internal notes about this beta tester..."
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Testing Access Expiry Date</label>
              <input
                type="datetime-local"
                value={formData.betaTesterExpiresAt}
                onChange={(e) => handleChange('betaTesterExpiresAt', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {!isLastStep && (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isLastStep && (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}