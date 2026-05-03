import Navigation from '@/components/Navigation';
import ThemeSelector from '@/components/ThemeSelector';
import ProfileBackLink from '@/components/ProfileBackLink';

export default function AppTheme() {
  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <ProfileBackLink />
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <h1 className="text-2xl font-bold mb-1">App Theme</h1>
          <p className="text-muted-foreground text-sm mb-6">Choose the visual style for your app. Changes apply instantly.</p>
          <ThemeSelector />
        </div>
      </main>
    </div>
  );
}