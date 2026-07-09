import { useEffect, useState } from 'react';
import { getOfflinePhotoObjectUrl, isOfflinePhotoRef } from '@/lib/offlinePhotoStore';

export default function OfflinePhotoImage({ src, alt = '', className = '' }) {
  const [displaySrc, setDisplaySrc] = useState(src || '');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    const load = async () => {
      if (!isOfflinePhotoRef(src)) {
        setDisplaySrc(src || '');
        return;
      }
      objectUrl = await getOfflinePhotoObjectUrl(src);
      if (!cancelled) setDisplaySrc(objectUrl || '');
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!displaySrc) {
    return <div className={`${className} bg-secondary text-muted-foreground flex items-center justify-center text-xs`}>Photo offline</div>;
  }

  return <img src={displaySrc} alt={alt} className={className} />;
}