const PROMPT_SEEN_KEY = 'permissions_prompt_seen';
const LOCATION_STATUS_KEY = 'location_permission_status';
const NOTIFICATION_STATUS_KEY = 'notification_permission_status';

function userKey(baseKey, userEmail) {
  return userEmail ? `${baseKey}:${userEmail}` : baseKey;
}

export function getStoredPermissionStatus(userEmail) {
  return {
    promptSeen: localStorage.getItem(userKey(PROMPT_SEEN_KEY, userEmail)) === 'true',
    location: localStorage.getItem(userKey(LOCATION_STATUS_KEY, userEmail)) || 'unknown',
    notifications: localStorage.getItem(userKey(NOTIFICATION_STATUS_KEY, userEmail)) || 'unknown',
  };
}

export function markPermissionsPromptSeen(userEmail) {
  localStorage.setItem(userKey(PROMPT_SEEN_KEY, userEmail), 'true');
}

export function saveLocationPermissionStatus(userEmail, status) {
  localStorage.setItem(userKey(LOCATION_STATUS_KEY, userEmail), status);
}

export function saveNotificationPermissionStatus(userEmail, status) {
  localStorage.setItem(userKey(NOTIFICATION_STATUS_KEY, userEmail), status);
}

export async function checkLocationPermission(userEmail) {
  if (!navigator.geolocation) {
    saveLocationPermissionStatus(userEmail, 'unsupported');
    return 'unsupported';
  }

  if (navigator.permissions?.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      saveLocationPermissionStatus(userEmail, result.state || 'unknown');
      return result.state || 'unknown';
    } catch {
      return getStoredPermissionStatus(userEmail).location;
    }
  }

  return getStoredPermissionStatus(userEmail).location;
}

export function requestLocationPermission(userEmail) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      saveLocationPermissionStatus(userEmail, 'unsupported');
      resolve({ status: 'unsupported', message: 'Location is not available on this device or browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        saveLocationPermissionStatus(userEmail, 'granted');
        resolve({ status: 'granted', message: 'Location permission enabled.' });
      },
      () => {
        saveLocationPermissionStatus(userEmail, 'denied');
        resolve({ status: 'denied', message: 'Location permission was denied. You can enable it later in your device settings.' });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function checkNotificationPermission(userEmail) {
  if (!('Notification' in window)) {
    saveNotificationPermissionStatus(userEmail, 'unsupported');
    return 'unsupported';
  }

  const status = Notification.permission || 'unknown';
  saveNotificationPermissionStatus(userEmail, status);
  return status;
}

export async function requestNotificationPermission(userEmail) {
  if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
    saveNotificationPermissionStatus(userEmail, 'unsupported');
    return { status: 'unsupported', message: 'Notifications are not available on this device or app mode.' };
  }

  const status = await Notification.requestPermission();
  saveNotificationPermissionStatus(userEmail, status);

  if (status === 'granted') {
    return { status, message: 'Notifications enabled.' };
  }

  if (status === 'denied') {
    return { status, message: 'Notifications were denied. You can enable them later in your device settings.' };
  }

  return { status, message: 'Notifications were not enabled.' };
}