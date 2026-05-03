import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { ALL_MODULES, useModules } from '@/context/ModulesContext';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import ModuleIcon from '@/components/ModuleIcon';
import ProfileBackLink from '@/components/ProfileBackLink';

export default function AppModules() {
  const { enabledModules, saveModules } = useModules();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (enabledModules) setSelected([...enabledModules]);
  }, [enabledModules]);

  const toggle = (key) => {
    setSaved(false);
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!selected || selected.length === 0) return;
    setSaving(true);
    await saveModules(selected);
    setSaving(false);
    setSaved(true);
  };

  if (!selected) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-12 mobile-page-padding">
        <ProfileBackLink />
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">App Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable features. Disabling a module hides it — your data is never deleted.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {ALL_MODULES.map((mod) => {
            const active = selected.includes(mod.key);
            return (
              <motion.button
                key={mod.key}
                type="button"
                onClick={() => toggle(mod.key)}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-all text-left bg-white dark:bg-slate-800 ${
                  active
                    ? 'border-primary'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <ModuleIcon moduleKey={mod.key} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  active ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {selected.length === 0 && (
          <p className="text-destructive text-xs text-center mb-3 font-medium">Please keep at least one module enabled.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {saved && (
          <p className="text-center text-sm text-green-600 dark:text-green-400 font-medium mt-3">✓ Saved successfully</p>
        )}
      </main>
    </div>
  );
}