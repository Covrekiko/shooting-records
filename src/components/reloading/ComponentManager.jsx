import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, X, ChevronDown, Download } from 'lucide-react';
import { format } from 'date-fns';
import { searchCalibers } from '@/utils/caliberCatalog';
import BrassLifecycleManager from './BrassLifecycleManager';
import { downloadBrassBatchPdf } from '@/utils/brassPdfExport';

const COMPONENT_TYPES = [
  { value: 'primer', label: 'Primer', units: ['pieces'] },
  { value: 'powder', label: 'Powder', units: ['grains', 'grams', 'kg', 'oz', 'lb'] },
  { value: 'brass', label: 'Brass / Cartridge', units: ['pieces'] },
  { value: 'bullet', label: 'Bullet', units: ['pieces'] },
];

export default function ComponentManager() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [user, setUser] = useState(null);
  const [catalogResults, setCatalogResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lockedComponentType, setLockedComponentType] = useState(null);
  const [showCaliberDropdown, setShowCaliberDropdown] = useState(false);
  const [caliberResults, setCaliberResults] = useState([]);
  const [formData, setFormData] = useState({
    component_type: 'primer',
    name: '',
    quantity_total: '',
    unit: 'pieces',
    price_total: '',
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    caliber: '',
    brand: '',
    bullet_name: '',
    weight: '',
    weight_unit: 'gr',
  });

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
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

  const convertToGrams = (value, unit) => {
    const conversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };
    return value * (conversions[unit] || 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const costPerUnit = parseFloat(formData.price_total) / parseFloat(formData.quantity_total);

      // For bullets, create a unique identifier combining brand, bullet_name, and caliber
      let displayName = formData.name;
      if (formData.component_type === 'bullet') {
        displayName = `${formData.brand} ${formData.bullet_name} (${formData.caliber})`;
      }

      // For powder, normalize stock to grams for internal storage
      let quantityTotal = parseFloat(formData.quantity_total);
      let quantityRemaining = parseFloat(formData.quantity_total);
      let storageUnit = formData.unit;

      if (formData.component_type === 'powder') {
        // Convert to grams for storage
        quantityTotal = convertToGrams(quantityTotal, formData.unit);
        quantityRemaining = quantityTotal;
        storageUnit = 'grams';
      }

      const data = {
        ...formData,
        name: displayName,
        quantity_total: quantityTotal,
        quantity_remaining: quantityRemaining,
        unit: storageUnit,
        price_total: parseFloat(formData.price_total),
        cost_per_unit: costPerUnit,
      };

      if (editingId) {
        await base44.entities.ReloadingComponent.update(editingId, {
          component_type: data.component_type,
          name: data.name,
          quantity_total: data.quantity_total,
          quantity_remaining: data.quantity_remaining,
          unit: data.unit,
          price_total: data.price_total,
          cost_per_unit: data.cost_per_unit,
          date_acquired: data.date_acquired,
          notes: data.notes,
          caliber: data.caliber,
          brand: data.brand,
          bullet_name: data.bullet_name,
          weight: data.weight,
          weight_unit: data.weight_unit,
        });
      } else {
        await base44.entities.ReloadingComponent.create(data);
      }

      await loadComponents();
      setShowForm(false);
      setEditingId(null);
      setLockedComponentType(null);
      setFormData({
        component_type: 'primer',
        name: '',
        quantity_total: '',
        unit: 'pieces',
        price_total: '',
        date_acquired: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        caliber: '',
        brand: '',
        bullet_name: '',
        weight: '',
        weight_unit: 'gr',
      });
    } catch (error) {
      console.error('Error saving component:', error);
      alert('Error saving component: ' + error.message);
    }
  };

  const handleEdit = (component) => {
    setEditingId(component.id);
    setLockedComponentType(component.component_type);

    // For powder stored in grams, convert back to a reasonable display unit
    let displayQuantity = component.quantity_total;
    let displayUnit = component.unit;

    if (component.component_type === 'powder' && component.unit === 'grams' && component.quantity_total >= 1000) {
      displayQuantity = component.quantity_total / 1000;
      displayUnit = 'kg';
    }

    // For bullets, parse the name back into separate fields
    let brand = component.brand || '';
    let bullet_name = component.bullet_name || '';
    if (component.component_type === 'bullet' && !brand && !bullet_name) {
      // Try to parse from name: "Brand Name (Caliber)"
      const match = component.name.match(/^(.+?)\s+(.+?)\s*\(([^)]+)\)$/);
      if (match) {
        brand = match[1];
        bullet_name = match[2];
      }
    }

    setFormData({
      component_type: component.component_type,
      name: component.name,
      quantity_total: displayQuantity,
      unit: displayUnit,
      price_total: component.price_total,
      date_acquired: component.date_acquired,
      notes: component.notes,
      caliber: component.caliber || '',
      brand: brand,
      bullet_name: bullet_name,
      weight: component.weight || '',
      weight_unit: component.weight_unit || 'gr',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this component?')) return;
    try {
      await base44.entities.ReloadingComponent.delete(id);
      await loadComponents();
    } catch (error) {
      console.error('Error deleting component:', error);
      alert('Error deleting component: ' + error.message);
    }
  };

  const searchBrandsCatalog = async (query) => {
    if (!query || query.length < 1) {
      setCatalogResults([]);
      return;
    }
    try {
      const results = await base44.entities.ReloadingBulletCatalog.list();
      const uniqueBrands = [...new Set(results.map(item => item.brand))];
      const filtered = uniqueBrands
        .filter(brand => brand?.toLowerCase().includes(query.toLowerCase()))
        .sort();
      setCatalogResults(filtered.map(brand => ({ brand })).slice(0, 8));
    } catch (error) {
      console.error('Error searching brands:', error);
      setCatalogResults([]);
    }
  };

  const searchBulletModelsCatalog = async (query, selectedBrand) => {
    if (!query || query.length < 1) {
      setCatalogResults([]);
      return;
    }
    try {
      const results = await base44.entities.ReloadingBulletCatalog.list();
      const filtered = results
        .filter(item => 
          item.brand?.toLowerCase() === selectedBrand?.toLowerCase() &&
          (item.product_name?.toLowerCase().includes(query.toLowerCase()) ||
           item.short_name?.toLowerCase().includes(query.toLowerCase()))
        )
        .sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
      setCatalogResults(filtered.slice(0, 8));
    } catch (error) {
      console.error('Error searching bullet models:', error);
      setCatalogResults([]);
    }
  };

  const searchCatalog = async (query, componentType) => {
    if (!query || query.length < 2) {
      setCatalogResults([]);
      return;
    }
    try {
      const catalogEntity = {
        primer: 'ReloadingPrimerCatalog',
        powder: 'ReloadingPowderCatalog',
        brass: 'ReloadingBrassCatalog',
      }[componentType];

      const results = await base44.entities[catalogEntity].list();
       const filtered = results
         .filter(item => {
           const searchLower = query.toLowerCase();
           if (componentType === 'brass') {
             return item.brand?.toLowerCase().includes(searchLower);
           }
           return (item.product_name?.toLowerCase().includes(searchLower) ||
                   item.brand?.toLowerCase().includes(searchLower) ||
                   item.short_name?.toLowerCase().includes(searchLower));
         })
         .reduce((unique, item) => {
           if (componentType === 'brass') {
             const exists = unique.some(u => u.brand?.toLowerCase() === item.brand?.toLowerCase());
             if (!exists) unique.push(item);
           } else {
             unique.push(item);
           }
           return unique;
         }, []);
      setCatalogResults(filtered.slice(0, 8));
    } catch (error) {
      console.error('Error searching catalog:', error);
      setCatalogResults([]);
    }
  };

  const handleCaliberSearch = (query) => {
    if (!query) {
      setCaliberResults([]);
      return;
    }
    const results = searchCalibers(query);
    setCaliberResults(results);
  };

  const handleSelectFromCatalog = (catalogItem) => {
    const componentType = formData.component_type;
    let displayName = catalogItem.product_name || catalogItem.short_name || '';
    let notesText = '';
    
    if (componentType === 'bullet') {
      displayName = `${catalogItem.brand} ${catalogItem.short_name || catalogItem.product_name}`.trim();
      notesText = `${catalogItem.weight_grains}gr • ${catalogItem.bullet_style}`.trim();
    } else if (componentType === 'brass') {
      displayName = catalogItem.brand;
    } else {
      displayName = catalogItem.product_name || catalogItem.short_name || '';
      notesText = `${catalogItem.brand || ''} ${catalogItem.product_line || ''}`.trim();
    }
    
    setFormData({
      ...formData,
      name: displayName,
      notes: notesText,
    });
    setShowDropdown(false);
    setCatalogResults([]);
  };

  const selectedType = COMPONENT_TYPES.find(t => t.value === formData.component_type);

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  const groupedByType = COMPONENT_TYPES.reduce((acc, type) => {
    acc[type.value] = components.filter(c => c.component_type === type.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{editingId ? 'Edit Component' : 'Add Component'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); setShowDropdown(false); setShowCaliberDropdown(false); setLockedComponentType(null); }} className="p-1 hover:bg-secondary rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Component Type</label>
              {lockedComponentType ? (
                <div className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground font-medium">
                  {COMPONENT_TYPES.find(t => t.value === lockedComponentType)?.label}
                </div>
              ) : (
                <select
                  value={formData.component_type}
                  onChange={(e) => {
                    const type = COMPONENT_TYPES.find(t => t.value === e.target.value);
                    setFormData({ ...formData, component_type: e.target.value, unit: type.units[0] });
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              )}
            </div>

            {formData.component_type === 'brass' && (
             <div className="relative">
               <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Caliber</label>
               <div className="relative">
                 <input
                   type="text"
                   value={formData.caliber}
                   onChange={(e) => {
                     setFormData({ ...formData, caliber: e.target.value });
                     handleCaliberSearch(e.target.value);
                     setShowCaliberDropdown(true);
                   }}
                   onFocus={() => setShowCaliberDropdown(formData.caliber.length >= 1)}
                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                   placeholder="e.g., .308 Winchester, 6.5 Creedmoor"
                 />
                 {showCaliberDropdown && caliberResults.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                     {caliberResults.map((caliber, idx) => (
                       <button
                         key={idx}
                         type="button"
                         onClick={() => {
                           setFormData({ ...formData, caliber });
                           setShowCaliberDropdown(false);
                           setCaliberResults([]);
                         }}
                         className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm"
                       >
                         {caliber}
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             </div>
            )}

            {formData.component_type === 'bullet' && (
             <>
               <div className="relative">
                 <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Brand</label>
                 <div className="relative">
                   <input
                     type="text"
                     value={formData.brand}
                     onChange={(e) => {
                       setFormData({ ...formData, brand: e.target.value, bullet_name: '' });
                       searchBrandsCatalog(e.target.value);
                       setShowDropdown(true);
                     }}
                     onFocus={() => formData.brand.length >= 1 && setShowDropdown(true)}
                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                     placeholder="e.g., Sako, Hornady, Sierra, Nosler"
                     required
                   />
                   {showDropdown && catalogResults.length > 0 && catalogResults[0].brand && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                       {catalogResults.map((item, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => {
                             setFormData({ ...formData, brand: item.brand, bullet_name: '' });
                             setShowDropdown(false);
                             setCatalogResults([]);
                           }}
                           className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm font-medium"
                         >
                           {item.brand}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>

               <div className="relative">
                 <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Bullet Name / Model</label>
                 <div className="relative">
                   <input
                     type="text"
                     value={formData.bullet_name}
                     onChange={(e) => {
                       setFormData({ ...formData, bullet_name: e.target.value });
                       searchBulletModelsCatalog(e.target.value, formData.brand);
                       setShowDropdown(true);
                     }}
                     onFocus={() => formData.bullet_name.length >= 1 && formData.brand && setShowDropdown(true)}
                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                     placeholder="e.g., Gamehead, V-MAX, MatchKing"
                     required
                     disabled={!formData.brand}
                   />
                   {showDropdown && catalogResults.length > 0 && catalogResults[0].product_name && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                       {catalogResults.map((item, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => {
                             setFormData({ ...formData, bullet_name: item.product_name });
                             setShowDropdown(false);
                             setCatalogResults([]);
                           }}
                           className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm font-medium"
                         >
                           {item.product_name || item.short_name}
                         </button>
                       ))}
                     </div>
                   )}
                   {!formData.brand && (
                     <p className="text-xs text-muted-foreground mt-1">Select a brand first</p>
                   )}
                 </div>
               </div>

               <div className="relative">
                 <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Caliber</label>
                 <div className="relative">
                   <input
                     type="text"
                     value={formData.caliber}
                     onChange={(e) => {
                       setFormData({ ...formData, caliber: e.target.value });
                       handleCaliberSearch(e.target.value);
                       setShowCaliberDropdown(true);
                     }}
                     onFocus={() => setShowCaliberDropdown(formData.caliber.length >= 1)}
                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                     placeholder="e.g., .308 Winchester, 6.5 Creedmoor"
                     required
                   />
                   {showCaliberDropdown && caliberResults.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                       {caliberResults.map((caliber, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => {
                             setFormData({ ...formData, caliber });
                             setShowCaliberDropdown(false);
                             setCaliberResults([]);
                           }}
                           className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm"
                         >
                           {caliber}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Weight (optional)</label>
                   <input
                     type="number"
                     value={formData.weight}
                     onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                     placeholder="e.g., 140"
                     step="0.1"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Unit</label>
                   <select
                     value={formData.weight_unit}
                     onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                   >
                     <option value="gr">gr (grains)</option>
                     <option value="g">g (grams)</option>
                   </select>
                 </div>
               </div>
             </>
            )}

            {formData.component_type !== 'bullet' && (
              <div className="relative">
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Component Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      searchCatalog(e.target.value, formData.component_type);
                      if (e.target.value.length >= 2) {
                        setShowDropdown(true);
                      }
                    }}
                    onFocus={() => formData.name.length >= 2 && setShowDropdown(true)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g., CCI 200, Vihtavuori N140"
                    required
                  />
                {showDropdown && catalogResults.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                     {catalogResults.map((item, idx) => {
                       const isBrass = formData.component_type === 'brass';
                       return (
                       <button
                         key={idx}
                         type="button"
                         onClick={() => handleSelectFromCatalog(item)}
                         className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm"
                       >
                         {isBrass ? (
                             <div className="font-medium">{item.brand}</div>
                           ) : (
                           <>
                             <div className="font-medium">{item.product_name || item.short_name}</div>
                             <div className="text-xs text-muted-foreground">{item.brand} • {item.product_line || ''}</div>
                           </>
                         )}
                       </button>
                     );
                     })}
                   </div>
                 )}
                </div>
                </div>
                )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity_total}
                  onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="1000"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {selectedType?.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Total Price (£)</label>
              <input
                type="number"
                value={formData.price_total}
                onChange={(e) => setFormData({ ...formData, price_total: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="100"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Date Acquired</label>
              <input
                type="date"
                value={formData.date_acquired}
                onChange={(e) => setFormData({ ...formData, date_acquired: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Any notes about this component"
                rows="2"
              />
            </div>

            <button type="submit" className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
              {editingId ? 'Update Component' : 'Add Component'}
            </button>
          </form>
        </div>
      )}

      {/* Components List */}
      <div className="space-y-6">
        {COMPONENT_TYPES.map(type => {
          const typeComponents = groupedByType[type.value];
          return (
            <div key={type.value}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{type.label}s ({typeComponents.length})</h3>
                {!showForm && (
                   <button
                     onClick={() => {
                       setFormData({ ...formData, component_type: type.value, unit: type.units[0], caliber: '', brand: '', bullet_name: '', weight: '', weight_unit: 'gr' });
                       setShowForm(true);
                       setLockedComponentType(type.value);
                     }}
                     className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90"
                   >
                     <Plus className="w-4 h-4" />
                     Add
                   </button>
                 )}
              </div>

              {typeComponents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No {type.label.toLowerCase()}s added yet</p>
              ) : (
                <div className="grid gap-3">
                  {typeComponents.map(comp => {
                    // For powder in grams, display in kg if >= 1000g
                    let displayRemaining = comp.quantity_remaining;
                    let displayTotal = comp.quantity_total;
                    let displayUnit = comp.unit;

                    if (comp.component_type === 'powder' && comp.unit === 'grams') {
                      if (comp.quantity_total >= 1000) {
                        displayRemaining = (comp.quantity_remaining / 1000).toFixed(2);
                        displayTotal = (comp.quantity_total / 1000).toFixed(2);
                        displayUnit = 'kg';
                      } else {
                        displayRemaining = comp.quantity_remaining.toFixed(2);
                        displayTotal = comp.quantity_total.toFixed(2);
                      }
                    }

                    return (
                    <div key={comp.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{comp.name}</h4>
                            {comp.component_type === 'brass' && comp.is_used_brass && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">USED</span>
                            )}
                          </div>
                          {comp.component_type === 'brass' && comp.batch_number && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">#{comp.batch_number}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {displayRemaining}/{displayTotal} {displayUnit}
                          </p>
                          {comp.component_type === 'brass' && (
                           <BrassLifecycleManager brass={comp} onUpdated={loadComponents} />
                         )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {comp.component_type === 'brass' && (
                            <button
                              onClick={() => downloadBrassBatchPdf(comp)}
                              className="p-2 hover:bg-secondary rounded transition-colors text-muted-foreground"
                              title="Download batch report PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(comp)}
                            className="p-2 hover:bg-secondary rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(comp.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                        <div>
                          <p className="text-muted-foreground">Unit Cost</p>
                          <p className="font-semibold">£{comp.cost_per_unit.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Cost</p>
                          <p className="font-semibold">£{comp.price_total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Added</p>
                          <p className="font-semibold">{format(new Date(comp.date_acquired), 'MMM d')}</p>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}