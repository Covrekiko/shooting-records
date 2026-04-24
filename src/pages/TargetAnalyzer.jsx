import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Target, Plus, History, BarChart2, Package, Crosshair, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const MENU_ITEMS = [
  { label: 'New Target Session', icon: Plus, path: '/target-analyzer/new', color: 'bg-primary text-primary-foreground' },
  { label: 'Previous Sessions', icon: History, path: '/target-analyzer/sessions', color: 'bg-slate-800 text-white dark:bg-slate-700' },
  { label: 'Rifle Accuracy History', icon: BarChart2, path: '/target-analyzer/rifle-history', color: 'bg-slate-800 text-white dark:bg-slate-700' },
  { label: 'Ammo Comparison', icon: Package, path: '/target-analyzer/ammo-comparison', color: 'bg-slate-800 text-white dark:bg-slate-700' },
  { label: 'Scope Zero / Click Cards', icon: Crosshair, path: '/scope-click-card', color: 'bg-slate-800 text-white dark:bg-slate-700' },
  { label: 'PDF Reports', icon: FileText, path: '/target-analyzer/reports', color: 'bg-slate-800 text-white dark:bg-slate-700' },
];

export default function TargetAnalyzer() {
  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Target Shooting Analyzer</h1>
            <p className="text-sm text-muted-foreground">Analyze groups, track accuracy, compare ammo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-5 rounded-2xl ${item.color} active:scale-95 transition-transform shadow-sm`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                <span className="text-lg font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}