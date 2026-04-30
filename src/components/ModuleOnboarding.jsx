import { useState } from 'react';
import { motion } from 'framer-motion';
import { ALL_MODULES } from '@/context/ModulesContext';
import ModuleIcon from '@/components/ModuleIcon';

export default function ModuleOnboarding({ onComplete }) {
  const [selected, setSelected] = useState(ALL_MODULES.map(m => m.key));
  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await onComplete(selected);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-foreground">Choose Your Modules</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Select the features you want to use. You can change this anytime in Settings.
            </p>
          </div>

          {/* Module cards */}
          <div className="space-y-3 mb-8">
            {ALL_MODULES.map((mod) => {
              const active = selected.includes(mod.key);
              return (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => toggle(mod.key)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-all text-left ${
                    active
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-600'
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
                    {active && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected.length === 0 && (
            <p className="text-center text-destructive text-xs mb-4 font-medium">Please select at least one module.</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : `Get Started →`}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            You can add or remove features later in <strong>Profile → App Modules</strong>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}