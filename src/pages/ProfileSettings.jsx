import Navigation from '@/components/Navigation';
import ProfileBackLink from '@/components/ProfileBackLink';
import { SettingsPanel } from '@/pages/Profile';

export default function ProfileSettings() {
  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-5xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <ProfileBackLink />
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SettingsPanel />
        </div>
      </main>
    </div>
  );
}