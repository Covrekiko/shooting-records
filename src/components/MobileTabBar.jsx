import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Shield, BookOpen, User, RefreshCw, WifiOff, CloudUpload, Map } from 'lucide-react';
import { useTabHistory, getTabForPath, TAB_DEFAULT } from '../context/TabHistoryContext';
import { useOffline } from '@/context/OfflineContext';
import { useOuting } from '@/context/OutingContext';
import { useModules } from '@/context/ModulesContext';

const TABS = [
  { key: 'home',    label: 'Home',    icon: Home },
  { key: 'armory',  label: 'Armory',  icon: Shield },
  { key: 'field',   label: 'Map',     icon: Map, module: 'stalk_map' },
  { key: 'records', label: 'Records', icon: BookOpen },
  { key: 'profile', label: 'Profile', icon: User },
];

const VISIBLE_TAB_MAP = {
  sessions: 'home',
};

function getVisibleTab(pathname) {
  const tab = getTabForPath(pathname);
  return VISIBLE_TAB_MAP[tab] || tab;
}

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setLastPath, getLastPath } = useTabHistory();
  const { isOnline, isSyncing, hasPending, syncFailed, pendingCount, manualSync } = useOffline();
  const { activeOuting } = useOuting();
  const { isEnabled } = useModules();

  // Track path changes into tab history
  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) setLastPath(tab, location.pathname);
  }, [location.pathname, setLastPath]);

  const activeTab = getVisibleTab(location.pathname);

  const handleTabPress = (tabKey) => {
    const lastPath = getLastPath(tabKey);
    navigate(lastPath || TAB_DEFAULT[tabKey]);
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
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-destructive-foreground text-xs font-semibold select-none ${syncPill.bg === 'bg-amber-500' ? 'bg-amber-500' : syncPill.bg === 'bg-red-500' ? 'bg-destructive' : syncPill.bg === 'bg-blue-500' ? 'bg-primary' : 'bg-muted'} ${syncPill.action ? 'active:opacity-80' : ''}`}
          >
            <PillIcon className={`w-3 h-3 flex-shrink-0 ${syncPill.spinning ? 'animate-spin' : ''}`} />
            {syncPill.label}
          </button>
        );
      })()}
      <div className="flex items-stretch">
        {TABS.filter(tab => !tab.module || isEnabled(tab.module)).map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          const isActiveOutingTab = key === 'field' && Boolean(activeOuting);
          return (
            <button
              key={key}
              onClick={() => handleTabPress(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[56px] flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-colors active:scale-90 transform-gpu select-none ${
                isActive ? 'text-primary' : isActiveOutingTab ? 'text-emerald-600' : 'text-muted-foreground'
              }`}
            >
              <div className={`relative flex items-center justify-center w-7 h-7 rounded-xl transition-all ${
                isActive ? 'bg-primary/10' : isActiveOutingTab ? 'bg-emerald-500/10' : ''
              }`}>
                <Icon style={{ width: isActive ? 20 : 18, height: isActive ? 20 : 18 }} />
                {isActiveOutingTab && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <span className={`text-xs font-semibold tracking-tight leading-tight ${
                isActive ? 'text-primary' : isActiveOutingTab ? 'text-emerald-600' : 'text-muted-foreground'
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