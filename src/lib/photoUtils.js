export async function convertHeicToJpg(file) {
  if (!file.type.includes('heic') && !file.type.includes('heif')) {
    return file;
  }

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Conversion timeout')), 5000)
    );
    
    const heic2any = (await import('heic2any')).default;
    const conversionPromise = heic2any({ blob: file });
    const blob = await Promise.race([conversionPromise, timeoutPromise]);
    
    const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
    return new File([jpegBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (error) {
    console.warn('HEIC conversion skipped, uploading original:', error.message);
    return file;
  }
}