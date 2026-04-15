import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';

export default function CatalogComponentSelector({ componentType, onSelect, onClose, selected }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customData, setCustomData] = useState({
    brand: '',
    product_name: '',
    notes: ''
  });

  const entityMap = {
    primer: 'ReloadingPrimerCatalog',
    powder: 'ReloadingPowderCatalog',
    bullet: 'ReloadingBulletCatalog',
    brass: 'ReloadingBrassCatalog'
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const entityName = entityMap[componentType];
      const list = await base44.entities[entityName].list();
      setComponents(list || []);
    } catch (error) {
      console.error(`Error loading ${componentType} catalog:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return components;

    const term = searchTerm.toLowerCase();
    return components.filter(item => {
      const searchFields = [
        item.product_name || '',
        item.short_name || '',
        item.brand || '',
        item.caliber || '',
        item.cartridge_caliber || '',
        item.powder_type || '',
        item.primer_size || '',
        item.bullet_style || '',
        item.weight_grains?.toString() || '',
        item.intended_use?.join(' ') || ''
      ].join(' ').toLowerCase();

      return searchFields.includes(term);
    });
  }, [searchTerm, components]);

  const getDisplayInfo = (item) => {
    switch (componentType) {
      case 'primer':
        return {
          main: item.product_name,
          meta: `${item.brand} • ${item.primer_size} • ${item.primer_type}`
        };
      case 'powder':
        return {
          main: item.product_name,
          meta: `${item.brand} • ${item.powder_type} • ${item.burn_rate_category}`
        };
      case 'bullet':
        return {
          main: item.product_name,
          meta: `${item.brand} • ${item.caliber} • ${item.weight_grains}gr • ${item.bullet_style}`
        };
      case 'brass':
        return {
          main: item.product_name,
          meta: `${item.brand} • ${item.cartridge_caliber}${item.primer_pocket_size ? ` • ${item.primer_pocket_size}` : ''}`
        };
      default:
        return { main: item.product_name, meta: '' };
    }
  };

  const handleCustomSubmit = () => {
    if (!customData.product_name.trim()) {
      alert('Please enter a product name');
      return;
    }
    onSelect({
      ...customData,
      custom: true,
      id: `custom-${Date.now()}`
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold capitalize">{componentType} Selection</h2>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${componentType}s by name, brand, specs...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Results or Custom */}
      <div className="flex-1 overflow-y-auto">
        {!showCustom ? (
          <>
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">No {componentType}s found</p>
                <button
                  onClick={() => setShowCustom(true)}
                  className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg font-medium"
                >
                  Add Custom {componentType.charAt(0).toUpperCase() + componentType.slice(1)}
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {filtered.map((item) => {
                    const display = getDisplayInfo(item);
                    const isSelected = selected?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={`w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${isSelected ? 'bg-secondary' : ''}`}
                      >
                        <div className="font-semibold text-sm text-foreground">{display.main}</div>
                        <div className="text-xs text-muted-foreground mt-1">{display.meta}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-border">
                  <button
                    onClick={() => setShowCustom(true)}
                    className="w-full px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg font-medium"
                  >
                    Don't see it? Add Custom {componentType.charAt(0).toUpperCase() + componentType.slice(1)}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Add a custom {componentType}</p>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Brand
              </label>
              <input
                type="text"
                placeholder="e.g., CCI, Hodgdon, Sierra"
                value={customData.brand}
                onChange={(e) => setCustomData({ ...customData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Product Name
              </label>
              <input
                type="text"
                placeholder={`e.g., ${componentType === 'primer' ? 'CCI 200 Large Rifle Primer' : componentType === 'powder' ? 'Hodgdon Varget' : componentType === 'bullet' ? 'Sierra 168 gr MatchKing .308' : 'Lapua .308 Brass'}`}
                value={customData.product_name}
                onChange={(e) => setCustomData({ ...customData, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Notes (optional)
              </label>
              <textarea
                placeholder="Any additional details..."
                value={customData.notes}
                onChange={(e) => setCustomData({ ...customData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                rows="2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-border flex-shrink-0">
        {showCustom && (
          <>
            <button
              onClick={() => setShowCustom(false)}
              className="flex-1 py-2 border border-border rounded-lg font-semibold hover:bg-secondary"
            >
              Back
            </button>
            <button
              onClick={handleCustomSubmit}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
            >
              Add Custom
            </button>
          </>
        )}
        {!showCustom && (
          <button
            onClick={onClose}
            className="w-full py-2 border border-border rounded-lg font-semibold hover:bg-secondary"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}