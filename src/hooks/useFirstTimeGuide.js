import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'shootingRecords.guides.';

export function getGuideStorageKey(guideKey) {
  return `${PREFIX}${guideKey}`;
}

export default function useFirstTimeGuide(guideKey) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!guideKey || typeof window === 'undefined') return;
    setShouldShow(window.localStorage.getItem(getGuideStorageKey(guideKey)) !== 'true');
  }, [guideKey]);

  const markSeen = useCallback(() => {
    if (!guideKey || typeof window === 'undefined') return;
    window.localStorage.setItem(getGuideStorageKey(guideKey), 'true');
    setShouldShow(false);
  }, [guideKey]);

  return { shouldShow, markSeen };
}