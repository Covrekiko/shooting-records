import heic2any from 'heic2any';

export async function convertHeicToJpg(file) {
  console.log('convertHeicToJpg called with:', file.name, file.type);
  
  if (!file.type.includes('heic') && !file.type.includes('heif')) {
    console.log('Not HEIC, returning original');
    return file;
  }

  try {
    console.log('Converting HEIC to JPG...');
    const blob = await heic2any({ blob: file });
    console.log('Conversion result:', blob);
    
    const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
    const jpegFile = new File([jpegBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
    console.log('HEIC converted successfully:', jpegFile.name, jpegFile.type);
    return jpegFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return file;
  }
}