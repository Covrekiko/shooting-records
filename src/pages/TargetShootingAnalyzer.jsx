import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Target, Plus, History, BarChart3, FlaskConical, ScanLine, FileText, ChevronRight } from 'lucide-react';
import SessionList from '@/components/analyzer/SessionList';
import NewSessionForm from '@/components/analyzer/NewSessionForm';
import RifleAccuracyHistory from '@/components/analyzer/RifleAccuracyHistory';
import AmmoComparison from '@/components/analyzer/AmmoComparison';
import SessionDetail from '@/components/analyzer/SessionDetail';

const SCREENS = {
  MENU: 'menu',
  NEW_SESSION: 'new_session',
  SESSIONS: 'sessions',
  RIFLE_HISTORY: 'rifle_history',
  AMMO_COMPARISON: 'ammo_comparison',
  SCOPE_CARDS: 'scope_cards',
  SESSION_DETAIL: 'session_detail',
};

const MENU_ITEMS = [
  { id: SCREENS.NEW_SESSION, label: 'New Target Session', icon: Plus, color: 'bg-primary text-primary-foreground', desc: 'Log a new range session' },
  { id: SCREENS.SESSIONS, label: 'Previous Sessions', icon: History, color: 'bg-card border border-border', desc: 'View & manage your sessions' },
  { id: SCREENS.RIFLE_HISTORY, label: 'Rifle Accuracy History', icon: BarChart3, color: 'bg-card border border-border', desc: 'Per-rifle stats & best groups' },
  { id: SCREENS.AMMO_COMPARISON, label: 'Ammo Comparison', icon: FlaskConical, color: 'bg-card border border-border', desc: 'Compare loads for each rifle' },
  { id: 'scope_link', label: 'Scope Zero / Click Cards', icon: ScanLine, color: 'bg-card border border-border', desc: 'View & edit scope DOPE cards', link: '/scope-click-card' },
];

export default function TargetShootingAnalyzer() {
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editSession, setEditSession] = useState(null);

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setScreen(SCREENS.SESSION_DETAIL);
  };

  const handleNewSession = () => {
    setEditSession(null);
    setScreen(SCREENS.NEW_SESSION);
  };

  const handleEditSession = (session) => {
    setEditSession(session);
    setScreen(SCREENS.NEW_SESSION);
  };

  const handleSessionSaved = (session) => {
    setSelectedSession(session);
    setScreen(SCREENS.SESSION_DETAIL);
  };

  const handleBack = () => {
    if (screen === SCREENS.SESSION_DETAIL) {
      setScreen(SCREENS.SESSIONS);
    } else {
      setScreen(SCREENS.MENU);
    }
  };

  if (screen === SCREENS.NEW_SESSION) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <NewSessionForm
          editSession={editSession}
          onSaved={handleSessionSaved}
          onBack={() => setScreen(SCREENS.MENU)}
        />
      </div>
    );
  }

  if (screen === SCREENS.SESSION_DETAIL && selectedSession) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SessionDetail
          session={selectedSession}
          onBack={handleBack}
          onEdit={() => handleEditSession(selectedSession)}
          onNewSession={handleNewSession}
        />
      </div>
    );
  }

  if (screen === SCREENS.SESSIONS) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SessionList
          onBack={() => setScreen(SCREENS.MENU)}
          onView={handleViewSession}
          onNew={handleNewSession}
        />
      </div>
    );
  }

  if (screen === SCREENS.RIFLE_HISTORY) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <RifleAccuracyHistory onBack={() => setScreen(SCREENS.MENU)} />
      </div>
    );
  }

  if (screen === SCREENS.AMMO_COMPARISON) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <AmmoComparison onBack={() => setScreen(SCREENS.MENU)} />
      </div>
    );
  }

  // MENU
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8 mobile-page-padding">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Target Shooting Analyzer</h1>
            <p className="text-sm text-muted-foreground">Precision tracking & analysis</p>
          </div>
        </div>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.link) {
              return (
                <a key={item.id} href={item.link}
                  className={`flex items-center gap-4 p-5 rounded-2xl ${item.color} transition-all active:scale-95`}>
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
              );
            }
            return (
              <button key={item.id} onClick={() => setScreen(item.id)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl ${item.color} transition-all active:scale-95 text-left`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.id === SCREENS.NEW_SESSION ? 'bg-white/20' : 'bg-secondary'}`}>
                  <Icon className={`w-6 h-6 ${item.id === SCREENS.NEW_SESSION ? 'text-white' : 'text-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">{item.label}</p>
                  <p className={`text-sm ${item.id === SCREENS.NEW_SESSION ? 'text-white/80' : 'text-muted-foreground'}`}>{item.desc}</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${item.id === SCREENS.NEW_SESSION ? 'text-white/60' : 'text-muted-foreground'}`} />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}