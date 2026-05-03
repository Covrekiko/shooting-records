import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Image } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';

export default function PhotoUpload({ photos = [], onPhotosChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    if (!navigator.onLine) {
      alert('Photo upload requires internet. Please try again when online.');
      return;
    }
    setUploading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const response = await base44.integrations.Core.UploadFile({ file: compressed });
        newUrls.push(response.file_url);
      }
      onPhotosChange([...photos, ...newUrls]);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <div className="border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading...' : 'Click to upload photos'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 bg-destructive text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}