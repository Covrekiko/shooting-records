import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Settings, FileText, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Profile() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    setLoading(true);
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-48">
            <div className="space-y-2">
              <Link
                to="/settings/rifles"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/profile/settings')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <Link
                to="/records"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/profile/records')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <FileText className="w-5 h-5" />
                Records
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-5 h-5" />
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isActive('/profile/settings') || isActive('/profile') || isActive('/settings') ? (
              <SettingsPanel />
            ) : isActive('/records') ? (
              <RecordsPanel />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingsPanel() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <p className="text-muted-foreground">Manage your firearms and locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingCard title="Rifles" description="Manage your rifle collection" link="/settings/rifles" />
        <SettingCard title="Shotguns" description="Manage your shotgun collection" link="/settings/shotguns" />
        <SettingCard title="Clubs" description="Manage shooting clubs" link="/settings/clubs" />
        <SettingCard title="Deer Locations" description="Manage deer hunting locations" link="/settings/locations" />
      </div>
    </div>
  );
}

function SettingCard({ title, description, link }) {
  return (
    <Link to={link} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all hover:border-primary">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function RecordsPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Records</h2>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">View and manage all your shooting records</p>
        <Link to="/records" className="mt-4 inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          View All Records
        </Link>
      </div>
    </div>
  );
}