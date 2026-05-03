import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Shield, BookOpen, User, RefreshCw, WifiOff, CloudUpload, Map } from 'lucide-react';
import { useTabHistory, getTabForPath, TAB_DEFAULT } from '../context/TabHistoryContext';
import { useOffline } from '@/context/OfflineContext';

const TABS = [
  { key: 'home',    label: 'Home',         icon: Home },
  { key: 'field',   label: 'Stalking Map', icon: Map },
  { key: 'armory',  label: 'Armory',       icon: Shield },
  { key: 'records', label: 'Records',      icon: BookOpen },
  { key: 'profile', label: 'Profile',      icon: User },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setLastPath, getLastPath } = useTabHistory();
  const { isOnline, isSyncing, hasPending, syncFailed, pendingCount, manualSync } = useOffline();

  // Track path changes into tab history
  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) setLastPath(tab, location.pathname);
  }, [location.pathname, setLastPath]);

  // Hide on full-screen pages like the stalking map
  if (location.pathname === '/deer-stalking') return null;

  const activeTab = getTabForPath(location.pathname);

  const handleTabPress = (tabKey) => {
    // Always navigate to the tab's default root — no "resume last path" behaviour
    navigate(TAB_DEFAULT[tabKey]);
  };

  // Sync status pill config
  let syncPill = null;
  if (!isOnline) {
    syncPill = { icon: WifiOff, label: 'Offline', bg: 'bg-slate-600', action: null };
  } else if (isSyncing) {
    syncPill = { icon: RefreshCw, label: `Syncing…`, bg: 'bg-blue-500', spinning: true, action: null };
  } else if (syncFailed) {
    syncPill = { icon: CloudUpload, label: 'Sync failed — tap to retry', bg: 'bg-red-500', action: manualSync };
  } else if (hasPending) {
    syncPill = { icon: CloudUpload, label: `${pendingCount} pending`, bg: 'bg-amber-500', action: manualSync };
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9000] bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Sync status strip */}
      {syncPill && (() => {
        const PillIcon = syncPill.icon;
        return (
          <button
            onClick={syncPill.action || undefined}
            disabled={!syncPill.action}
            className={`w-full flex items-center justify-center gap-1.5 py-1 text-destructive-foreground text-[10px] font-semibold select-none ${syncPill.bg === 'bg-amber-500' ? 'bg-amber-500' : syncPill.bg === 'bg-red-500' ? 'bg-destructive' : syncPill.bg === 'bg-blue-500' ? 'bg-primary' : 'bg-muted'} ${syncPill.action ? 'active:opacity-80' : ''}`}
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
              className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-colors active:scale-90 transform-gpu select-none ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded-xl transition-all ${
                isActive ? 'bg-primary/10' : ''
              }`}>
                <Icon style={{ width: isActive ? 20 : 18, height: isActive ? 20 : 18 }} />
              </div>
              <span className={`text-[9px] font-semibold tracking-tight leading-none ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}