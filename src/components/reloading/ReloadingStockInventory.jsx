import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';
import PowderStockCalculator from './PowderStockCalculator';

const COMPONENT_TYPES = [
  { value: 'primer', label: 'Primers' },
  { value: 'powder', label: 'Powder' },
  { value: 'brass', label: 'Brass / Cartridge' },
  { value: 'bullet', label: 'Bullets' },
];

export default function ReloadingStockInventory() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedPowder, setExpandedPowder] = useState(null);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const componentsList = await base44.entities.ReloadingComponent.filter({
        created_by: currentUser.email,
      });
      setComponents(componentsList);
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (component) => {
    const percentRemaining = (component.quantity_remaining / component.quantity_total) * 100;
    if (percentRemaining > 50) return { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950', label: 'Good' };
    if (percentRemaining > 25) return { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950', label: 'Low' };
    return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950', label: 'Critical' };
  };

  const groupedComponents = COMPONENT_TYPES.reduce((acc, type) => {
    acc[type.value] = components.filter(c => c.component_type === type.value);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Reloading Stock Inventory</h2>
        <p className="text-muted-foreground">Track your reloading component stock across all categories</p>
      </div>

      {COMPONENT_TYPES.map(type => {
        const typeComponents = groupedComponents[type.value];
        if (typeComponents.length === 0) return null;

        return (
          <div key={type.value} className="space-y-3">
            <h3 className="font-bold text-lg border-b border-border pb-2">{type.label}</h3>
            
            <div className="grid gap-3">
              {typeComponents.map(comp => {
                const status = getStockStatus(comp);
                const percentRemaining = (comp.quantity_remaining / comp.quantity_total) * 100;

                return (
                  <div key={comp.id} className={`${status.bg} rounded-lg p-4 border border-border`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{comp.name}</h4>
                        {type.value === 'brass' && (
                          <p className="text-xs font-semibold mt-1">
                            {(() => {
                              // FIX 6: Support multiple used brass indicators
                              const isUsedBrass = 
                                comp.is_used_brass === true ||
                                comp.condition === 'used' ||
                                comp.brassCondition === 'used' ||
                                comp.isPreviouslyFired === true ||
                                (comp.times_reloaded || 0) > 0;

                              if (isUsedBrass) {
                                return (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Used brass / Previously fired{comp.times_reloaded > 0 ? ` — ${comp.times_reloaded}x reloaded` : ''}
                                  </span>
                                );
                              }
                              return <span className="text-green-600 dark:text-green-400">New brass</span>;
                            })()}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{comp.notes || 'No notes'}</p>
                      </div>
                      <span className={`${status.color} text-xs font-bold px-2 py-1 rounded bg-white/50 dark:bg-black/30`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground">Stock Remaining</span>
                         <span className="font-semibold">
                           {(() => {
                             if (type.value === 'powder' && comp.unit === 'grams' && comp.quantity_total >= 1000) {
                               return `${(comp.quantity_remaining / 1000).toFixed(2)} / ${(comp.quantity_total / 1000).toFixed(2)} kg`;
                             }
                             return `${comp.quantity_remaining.toLocaleString()} / ${comp.quantity_total.toLocaleString()} ${comp.unit}`;
                           })()}
                         </span>
                       </div>

                      <div className="w-full bg-white/40 dark:bg-black/40 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentRemaining > 50
                              ? 'bg-green-600'
                              : percentRemaining > 25
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${percentRemaining}%` }}
                        />
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {percentRemaining.toFixed(1)}% remaining
                      </div>
                    </div>

                    {type.value === 'powder' && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <button
                          onClick={() => setExpandedPowder(expandedPowder === comp.id ? null : comp.id)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {expandedPowder === comp.id ? '▼ Hide Calculator' : '► Show Calculator'}
                        </button>
                        {expandedPowder === comp.id && (
                          <div className="mt-3">
                            <PowderStockCalculator component={comp} />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Unit Cost</p>
                        <p className="font-semibold">£{comp.cost_per_unit.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining Value</p>
                        <p className="font-semibold">£{(comp.cost_per_unit * comp.quantity_remaining).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Added</p>
                        <p className="font-semibold">{new Date(comp.date_acquired).toLocaleDateString('en-GB', {month: 'short', day: 'numeric'})}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.values(groupedComponents).every(arr => arr.length === 0) && (
        <div className="bg-secondary/30 rounded-lg p-8 text-center border border-border flex items-center justify-center gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          <p className="text-muted-foreground">No reloading components added yet. Add components to track your stock.</p>
        </div>
      )}
    </div>
  );
}