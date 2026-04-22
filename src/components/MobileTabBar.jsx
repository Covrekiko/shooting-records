import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, Shield, BookOpen, User } from 'lucide-react';
import { useTabHistory, getTabForPath, TAB_DEFAULT } from '@/context/TabHistoryContext';

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

  // Track path changes into tab history
  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) setLastPath(tab, location.pathname);
  }, [location.pathname]);

  // Hide on full-screen pages like the stalking map
  if (location.pathname === '/deer-stalking') return null;

  const activeTab = getTabForPath(location.pathname);

  const handleTabPress = (tabKey) => {
    if (tabKey === activeTab) {
      // Already on this tab — navigate to tab default (scroll-to-top / reset)
      navigate(TAB_DEFAULT[tabKey]);
      return;
    }
    // Navigate to last remembered path within that tab
    const dest = getLastPath(tabKey);
    navigate(dest);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              onClick={() => handleTabPress(key)}
              className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-colors active:scale-90 transform-gpu ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className={`relative flex items-center justify-center w-7 h-7 rounded-xl transition-all ${
                isActive ? 'bg-primary/10 dark:bg-primary/20' : ''
              }`}>
                <Icon className={`w-4.5 h-4.5 transition-all ${isActive ? 'w-5 h-5' : ''}`} style={{ width: isActive ? 20 : 18, height: isActive ? 20 : 18 }} />
              </div>
              <span className={`text-[9px] font-semibold tracking-tight leading-none ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}