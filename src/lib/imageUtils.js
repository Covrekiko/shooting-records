/**
 * Compresses and resizes an image file before upload.
 * - Converts HEIC/HEIF to JPEG (Safari on iOS decodes them via <img> tag)
 * - Resizes max dimension to 1600px
 * - Compresses to ~0.82 quality JPEG
 * Returns a File (JPEG) ready for upload.
 */
export async function compressImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

  const isHeic = HEIC_TYPES.includes(file.type?.toLowerCase()) ||
    /\.(heic|heif)$/i.test(file.name);

  // Treat blank type (common with iPhone camera) as an image — always try to compress
  const isImage = file.type?.startsWith('image/') || !file.type || isHeic;

  if (!isImage) {
    return file;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    // Add a per-decode timeout in case img.onload never fires (e.g. broken HEIC on non-Safari)
    const decodeTimeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(file);
    }, 15000);

    img.onload = () => {
      clearTimeout(decodeTimeout);
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        if (!width || !height) { resolve(file); return; }

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
            if (!blob) {
              console.warn('[compressImage] canvas.toBlob returned null, returning original file');
              resolve(file);
              return;
            }
            const safeName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            const compressed = new File([blob], safeName, { type: 'image/jpeg' });
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        resolve(file);
      }
    };

    img.onerror = () => {
      clearTimeout(decodeTimeout);
      URL.revokeObjectURL(url);
      // Still resolve (not reject) so upload can proceed with original
      resolve(file);
    };

    img.src = url;
  });
}