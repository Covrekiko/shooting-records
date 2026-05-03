import { useEffect, useState } from 'react';
import { Bell, MapPin } from 'lucide-react';
import {
  checkLocationPermission,
  checkNotificationPermission,
  getStoredPermissionStatus,
  requestLocationPermission,
  requestNotificationPermission,
} from '@/lib/appPermissions';

const statusLabels = {
  granted: 'Enabled',
  denied: 'Denied',
  prompt: 'Not decided',
  default: 'Not decided',
  unsupported: 'Unavailable',
  unknown: 'Unknown',
};

function StatusPill({ status }) {
  const safeStatus = status || 'unknown';
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
      safeStatus === 'granted'
        ? 'bg-emerald-500/10 text-emerald-600'
        : safeStatus === 'denied'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-secondary text-muted-foreground'
    }`}>
      {statusLabels[safeStatus] || statusLabels.unknown}
    </span>
  );
}

export default function AppPermissionsPanel({ userEmail, compact = false, onActionComplete }) {
  const [status, setStatus] = useState(() => getStoredPermissionStatus(userEmail));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const refreshStatus = async () => {
    const [location, notifications] = await Promise.all([
      checkLocationPermission(userEmail),
      checkNotificationPermission(userEmail),
    ]);
    setStatus({ ...getStoredPermissionStatus(userEmail), location, notifications });
  };

  useEffect(() => {
    refreshStatus();
  }, [userEmail]);

  const enableLocation = async () => {
    setBusy('location');
    const result = await requestLocationPermission(userEmail);
    setMessage(result.message);
    await refreshStatus();
    setBusy('');
    onActionComplete?.();
  };

  const enableNotifications = async () => {
    setBusy('notifications');
    const result = await requestNotificationPermission(userEmail);
    setMessage(result.message);
    await refreshStatus();
    setBusy('');
    onActionComplete?.();
  };

  return (
    <div className={compact ? 'space-y-4' : 'border border-border rounded-xl p-4 space-y-4'}>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Shooting Records uses location for check-in, check-out, map records, and stalking activity logs. Notifications are used for important app alerts and reminders.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Location</p>
              <p className="text-xs text-muted-foreground">One-time permission request only</p>
            </div>
          </div>
          <StatusPill status={status.location} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">Handled gracefully if unsupported</p>
            </div>
          </div>
          <StatusPill status={status.notifications} />
        </div>
      </div>

      {message && <p className="text-sm font-medium text-foreground bg-secondary rounded-xl p-3">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={enableLocation}
          disabled={busy !== ''}
          className="h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === 'location' ? 'Checking…' : 'Enable Location'}
        </button>
        <button
          type="button"
          onClick={enableNotifications}
          disabled={busy !== ''}
          className="h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === 'notifications' ? 'Checking…' : 'Enable Notifications'}
        </button>
      </div>
    </div>
  );
}