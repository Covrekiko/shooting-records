import { useMapEvents } from 'react-leaflet';

export default function MapClickHandler({ onMapClick, isSelectionMode }) {
  useMapEvents({
    click: (e) => {
      if (isSelectionMode) {
        onMapClick(e);
      }
    },
  });

  return null;
}