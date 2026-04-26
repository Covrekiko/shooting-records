import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Shield, BookOpen, User, RefreshCw, WifiOff, CloudUpload } from 'lucide-react';
import { useTabHistory, getTabForPath, TAB_DEFAULT } from '../context/TabHistoryContext';
import { useOffline } from '../context/OfflineContext';

const TABS = [
  { key: 'home',    label: 'Home',    icon: Home },
  { key: 'armory',  label: 'Armory',  icon: Shield },
  { key: 'records', label: 'Records', icon: BookOpen },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setLastPath, getLastPath } = useTabHistory();
  const { isOnline, isSyncing, hasPending, syncFailed, pendingCount, manualSync } = useOffline();

  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) setLastPath(tab, location.pathname);
  }, [location.pathname, setLastPath]);

  if (location.pathname === '/deer-stalking') return null;

  const activeTab = getTabForPath(location.pathname);

  const handleTabPress = (tabKey) => {
    if (tabKey === activeTab) {
      navigate(TAB_DEFAULT[tabKey]);
      return;
    }
    const dest = getLastPath(tabKey);
    navigate(dest);
  };

  let syncPill = null;
  if (!isOnline) {
    syncPill = { icon: WifiOff, label: 'Offline', bg: '#2E3732', action: null };
  } else if (isSyncing) {
    syncPill = { icon: RefreshCw, label: 'Syncing…', bg: '#1E3A5F', spinning: true, action: null };
  } else if (syncFailed) {
    syncPill = { icon: CloudUpload, label: 'Sync failed — tap to retry', bg: '#B84A3A', action: manualSync };
  } else if (hasPending) {
    syncPill = { icon: CloudUpload, label: `${pendingCount} pending`, bg: '#8A6A35', action: manualSync };
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9000]"
      style={{
        background: '#151A18',
        borderTop: '1px solid #2E3732',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Sync status strip */}
      {syncPill && (() => {
        const PillIcon = syncPill.icon;
        return (
          <button
            onClick={syncPill.action || undefined}
            disabled={!syncPill.action}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-[10px] font-semibold"
            style={{ background: syncPill.bg, color: '#F2F2EF' }}
          >
            <PillIcon className={`w-3 h-3 flex-shrink-0 ${syncPill.spinning ? 'animate-spin' : ''}`} />
            {syncPill.label}
          </button>
        );
      })()}

      <div className="flex items-stretch">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => handleTabPress(key)}
              className="flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-all active:scale-90 transform-gpu"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={isActive ? { background: 'rgba(199,154,69,0.15)' } : {}}
              >
                <Icon
                  style={{
                    width: isActive ? 20 : 18,
                    height: isActive ? 20 : 18,
                    color: isActive ? '#C79A45' : '#A8ADA7',
                  }}
                />
              </div>
              <span
                className="text-[9px] font-semibold tracking-tight leading-none"
                style={{ color: isActive ? '#C79A45' : '#A8ADA7' }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="w-4 h-0.5 rounded-full mt-0.5"
                  style={{ background: '#C79A45' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}