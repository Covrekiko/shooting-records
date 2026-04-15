// Predefined component library for reloading supplies

export const PRIMER_LIBRARY = [
  { brand: 'CCI', name: 'CCI 200', type: 'Standard Rifle', size: 'Large Rifle' },
  { brand: 'CCI', name: 'CCI 250', type: 'Magnum Rifle', size: 'Large Rifle Magnum' },
  { brand: 'Federal', name: 'Federal 210', type: 'Standard Rifle', size: 'Large Rifle' },
  { brand: 'Federal', name: 'Federal 215', type: 'Magnum Rifle', size: 'Large Rifle Magnum' },
  { brand: 'Winchester', name: 'Winchester WLR', type: 'Standard Rifle', size: 'Large Rifle' },
  { brand: 'Remington', name: 'Remington 9½', type: 'Standard Rifle', size: 'Large Rifle' },
];

export const POWDER_LIBRARY = [
  { brand: 'Hodgdon', name: 'H4895', type: 'Rifle', burnRate: 'Medium' },
  { brand: 'Hodgdon', name: 'Varget', type: 'Rifle', burnRate: 'Medium' },
  { brand: 'Vihtavuori', name: 'N140', type: 'Rifle', burnRate: 'Medium' },
  { brand: 'Vihtavuori', name: 'N150', type: 'Rifle', burnRate: 'Medium-Slow' },
  { brand: 'Alliant', name: 'Reloder 15', type: 'Rifle', burnRate: 'Medium' },
  { brand: 'IMR', name: '4064', type: 'Rifle', burnRate: 'Medium-Slow' },
];

export const BULLET_LIBRARY = [
  { brand: 'Hornady', name: 'SST', weight: 165, type: 'Soft Point', caliber: '.308' },
  { brand: 'Hornady', name: 'ELD-X', weight: 178, type: 'Expanding', caliber: '.308' },
  { brand: 'Nosler', name: 'Ballistic Tip', weight: 165, type: 'Polymer Tip', caliber: '.308' },
  { brand: 'Sierra', name: 'GameKing', weight: 165, type: 'Boat Tail', caliber: '.308' },
  { brand: 'Barnes', name: 'TTSX', weight: 165, type: 'Monolithic', caliber: '.308' },
];

export const BRASS_LIBRARY = [
  { brand: 'Lapua', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
  { brand: 'Hornady', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
  { brand: 'Winchester', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
  { brand: 'Norma', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
  { brand: 'Remington', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
  { brand: 'Sako', caliber: '.308 Win', caseLength: '2.015', material: 'Brass' },
];

export const searchLibrary = (query, libraryType) => {
  const libraries = {
    primer: PRIMER_LIBRARY,
    powder: POWDER_LIBRARY,
    bullet: BULLET_LIBRARY,
    brass: BRASS_LIBRARY,
  };

  const library = libraries[libraryType] || [];
  if (!query || query.length < 2) return [];

  return library.filter(item =>
    (item.name?.toLowerCase().includes(query.toLowerCase()) ||
    item.brand?.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5);
};