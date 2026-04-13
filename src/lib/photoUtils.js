import heic2any from 'heic2any';

export async function convertHeicToJpg(file) {
  // If not HEIC, return original
  if (!file.type.includes('heic') && !file.type.includes('heif')) {
    return file;
  }

  try {
    const blob = await heic2any({ blob: file });
    return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (error) {
    console.warn('HEIC conversion failed, using original:', error);
    return file;
  }
}