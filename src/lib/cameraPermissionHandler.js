/**
 * Camera Permission Handler
 * Manages camera permissions and graceful error handling
 */
export const cameraPermissionHandler = {
  // Request camera permission
  requestCameraPermission: async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { granted: false, error: 'Camera API not supported' };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());

      return { granted: true, error: null };
    } catch (error) {
      return {
        granted: false,
        error: error.name === 'NotAllowedError' 
          ? 'Camera permission denied. Enable in settings.'
          : error.name === 'NotFoundError'
          ? 'No camera device found'
          : error.message || 'Failed to access camera',
      };
    }
  },

  // Check camera permission status
  checkCameraPermission: async () => {
    try {
      if (!navigator.permissions || !navigator.permissions.query) {
        return { status: 'unknown' };
      }

      const result = await navigator.permissions.query({ name: 'camera' });
      return { status: result.state }; // 'granted', 'denied', 'prompt'
    } catch (error) {
      return { status: 'unknown', error: error.message };
    }
  },

  // Handle camera capture with permission check
  capturePhoto: async () => {
    const permissionCheck = await cameraPermissionHandler.checkCameraPermission();

    if (permissionCheck.status === 'denied') {
      return {
        success: false,
        error: 'Camera permission denied. Please enable in settings.',
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
};