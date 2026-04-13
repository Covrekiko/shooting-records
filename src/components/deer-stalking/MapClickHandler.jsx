import { useMapEvents } from 'react-leaflet';
import { useRef, useEffect } from 'react';

export default function MapClickHandler({ onMapClick, isSelectionMode }) {
  const isSelectionModeRef = useRef(isSelectionMode);
  
  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);
  
  useMapEvents({
    click: (e) => {
      if (isSelectionModeRef.current) {
        onMapClick(e);
      }
    },
  });

  return null;
}