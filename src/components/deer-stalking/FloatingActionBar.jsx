import { useState } from 'react';
import { Plus, MapPin, Crosshair, LogOut } from 'lucide-react';

export default function FloatingActionBar({
  onPOI,
  onHarvest,
  onOuting,
  onRecenter,
  activeOuting,
  onEndOuting,
}) {
  const [expanded, setExpanded] = useState(false);

  const actions = [
    { icon: Plus, label: 'New Outing', onClick: onOuting },
    { icon: Crosshair, label: 'Live Location', onClick: onRecenter },
    { icon: MapPin, label: 'Add POI', onClick: onPOI },
    { icon: 'deer', label: 'Add Harvest', onClick: onHarvest },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* End Outing Button */}
      {activeOuting && (
        <button
          onClick={onEndOuting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all animate-pulse"
        >
          <LogOut className="w-5 h-5" />
          End Outing
        </button>
      )}

      {/* Menu Items */}
      {expanded && (
        <>
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setExpanded(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all"
            >
              {action.icon === 'deer' ? (
                <span className="text-lg">🦌</span>
              ) : (
                <action.icon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}