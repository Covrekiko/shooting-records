import { createElement, useCallback, useRef, useState } from 'react';
import FirstTimeGuideModal from '@/components/FirstTimeGuideModal';

const GUIDE_PREFIX = 'shootingRecords.guides.';

function storageKey(key) {
  return `${GUIDE_PREFIX}${key}`;
}

function hasSeenGuide(key) {
  return typeof window !== 'undefined' && window.localStorage.getItem(storageKey(key)) === 'true';
}

function markGuideSeen(key) {
  if (typeof window !== 'undefined') window.localStorage.setItem(storageKey(key), 'true');
}

export function useFirstTimeGuide(config) {
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef(null);

  const showGuideThen = useCallback((action) => {
    if (hasSeenGuide(config.key)) {
      action?.();
      return;
    }
    pendingActionRef.current = action;
    setOpen(true);
  }, [config.key]);

  const continueGuide = useCallback(() => {
    markGuideSeen(config.key);
    setOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, [config.key]);

  const Guide = useCallback(() => createElement(FirstTimeGuideModal, {
    open,
    title: config.title,
    description: config.description,
    steps: config.steps,
    onContinue: continueGuide,
  }), [open, config.title, config.description, config.steps, continueGuide]);

  return { Guide, showGuideThen };
}