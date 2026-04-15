/**
 * Camera Permission Handler
 * Manages camera permissions and graceful error handling
 * Respects user's permission decision and doesn't re-ask if denied
 */

// Store permission check status in sessionStorage to avoid repeated prompts
const CAMERA_PERMISSION_KEY = 'shootingRecords_cameraPermissionChecked';
const CAMERA_DENIED_KEY = 'shootingRecords_cameraPermissionDenied';

export const cameraPermissionHandler = {
  // Request camera permission (only once per session)
  requestCameraPermission: async () => {
    try {
      // If already denied in this session, don't ask again
      const isDeniedInSession = sessionStorage.getItem(CAMERA_DENIED_KEY);
      if (isDeniedInSession) {
        return { granted: false, error: 'Camera permission denied. Enable in device settings.' };
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { granted: false, error: 'Camera API not supported' };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());

      return { granted: true, error: null };
    } catch (error) {
      // Mark as denied in this session
      if (error.name === 'NotAllowedError') {
        sessionStorage.setItem(CAMERA_DENIED_KEY, 'true');
      }

      return {
        granted: false,
        error: error.name === 'NotAllowedError' 
          ? 'Camera permission denied. Enable in device settings.'
          : error.name === 'NotFoundError'
          ? 'No camera device found'
          : error.message || 'Failed to access camera',
      };
    }
  },

  // Check camera permission status
  checkCameraPermission: async () => {
    try {
      // If already denied in this session, return that status
      if (sessionStorage.getItem(CAMERA_DENIED_KEY)) {
        return { status: 'denied' };
      }

      if (!navigator.permissions || !navigator.permissions.query) {
        return { status: 'unknown' };
      }

      const result = await navigator.permissions.query({ name: 'camera' });
      
      // If denied, store it so we don't ask again this session
      if (result.state === 'denied') {
        sessionStorage.setItem(CAMERA_DENIED_KEY, 'true');
      }
      
      return { status: result.state }; // 'granted', 'denied', 'prompt'
    } catch (error) {
      return { status: 'unknown', error: error.message };
    }
  },

  // Handle camera capture with permission check (respects previous denial)
  capturePhoto: async () => {
    const permissionCheck = await cameraPermissionHandler.checkCameraPermission();

    if (permissionCheck.status === 'denied') {
      return {
        success: false,
        error: 'Camera permission denied. Please enable in device settings.',
      };
    }

    const permission = await cameraPermissionHandler.requestCameraPermission();

    if (!permission.granted) {
      return { success: false, error: permission.error };
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      return new Promise((resolve) => {
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            resolve({ success: true, file });
          } else {
            resolve({ success: false, error: 'Photo capture cancelled' });
          }
        };

        input.click();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear permission denial flag (e.g., if user changes settings)
  resetCameraPermissionCheck: () => {
    sessionStorage.removeItem(CAMERA_DENIED_KEY);
  },
};