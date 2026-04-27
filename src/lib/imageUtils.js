/**
 * Compresses and resizes an image file before upload.
 * - Converts HEIC/HEIF to JPEG (Safari on iOS decodes them via <img> tag)
 * - Resizes max dimension to 1600px
 * - Compresses to ~0.82 quality JPEG
 * Returns a File (JPEG) ready for upload.
 */
export async function compressImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

  const isHeic = HEIC_TYPES.includes(file.type?.toLowerCase()) ||
    /\.(heic|heif)$/i.test(file.name);

  // If not a known image type and not HEIC, return as-is (let server handle it)
  if (!isHeic && !SUPPORTED.includes(file.type?.toLowerCase())) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;

        // Resize if needed
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            const compressed = new File(
              [blob],
              file.name.replace(/\.(heic|heif)$/i, '.jpg'),
              { type: 'image/jpeg' }
            );
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If we can't decode it (shouldn't happen on iOS Safari for HEIC), 
      // fall back to original file and let server handle it
      resolve(file);
    };

    img.src = url;
  });
}