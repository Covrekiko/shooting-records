import heic2any from 'heic2any';

export async function convertHeicToJpg(file) {
  // If not HEIC, return original
  if (!file.type.includes('heic') && !file.type.includes('heif')) {
    return file;
  }

  try {
    let blob = await heic2any({ blob: file, toType: 'image/jpeg' });
    // heic2any can return an array of blobs
    if (Array.isArray(blob)) {
      blob = blob[0];
    }
    return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return file;
  }
}