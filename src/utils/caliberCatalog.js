// Comprehensive caliber catalog for autocomplete
export const CALIBER_CATALOG = [
  // Rifle - Common hunting calibers
  '.22 LR',
  '.22 Hornet',
  '.204 Ruger',
  '.22-250 Remington',
  '.220 Swift',
  '.223 Remington',
  '.222 Remington',
  '.22-08 Remington',
  '.243 Winchester',
  '.243 WSSM',
  '6mm Creedmoor',
  '6mm Remington',
  '.25-06 Remington',
  '.250 Savage',
  '.257 Roberts',
  '.257 Weatherby Magnum',
  '.260 Remington',
  '6.5 Creedmoor',
  '6.5x55 Swedish',
  '6.5 Weatherby Magnum',
  '6.5 PRC',
  '.270 Winchester',
  '.270 WSM',
  '.270 Weatherby Magnum',
  '7mm-08 Remington',
  '7mm Remington Magnum',
  '7mm WSM',
  '7mm Weatherby Magnum',
  '.280 Remington',
  '.30-30 Winchester',
  '.308 Winchester',
  '.30-06 Springfield',
  '.300 Winchester Magnum',
  '.300 WSM',
  '.300 Weatherby Magnum',
  '.300 PRC',
  '.300 Blackout',
  '.300 Savage',
  '.303 British',
  '.32 Winchester Special',
  '.338 Winchester Magnum',
  '.338 Lapua Magnum',
  '.340 Weatherby Magnum',
  '.358 Winchester',
  '.375 H&H Magnum',
  '.375 Weatherby Magnum',
  '.375 Ruger',
  '.416 Remington Magnum',
  '.416 Rigby',
  '.458 Winchester Magnum',
  '.458 Lott',
  '.460 Weatherby Magnum',
  
  // Pistol calibers
  '.22 LR',
  '.22 TCM',
  '.25 ACP',
  '.32 ACP',
  '.380 ACP',
  '9mm Luger',
  '9mm Parabellum',
  '9x21 IMI',
  '.38 Special',
  '.38 Super',
  '.357 Magnum',
  '10mm Auto',
  '.40 S&W',
  '.41 Magnum',
  '.44 Magnum',
  '.45 ACP',
  '.45 GAP',
  '.45 Colt',
  '.50 AE',
  '9mm Glisenti',
  '7.65mm Browning',
  '.32 S&W',
  '.32 S&W Long',
  '.32 H&R Magnum',
  '.327 Federal Magnum',
  '.357 SIG',
  '.38-40 Winchester',
  '.44-40 Winchester',
  '.45 Schofield',
  
  // Shotgun
  '.410 bore',
  '20 gauge',
  '16 gauge',
  '12 gauge',
  '10 gauge',
  '8 gauge',
  
  // Historical/Military
  '5.56mm NATO',
  '7.62mm NATO',
  '7.62x39 Soviet',
  '7.92x57 Mauser',
  '8x57 IS',
  '.30-40 Krag',
  '.45-70 Government',
  '.44-77 Sharps',
];

const CALIBER_ALIASES = {
  '.303': '.303 British',
  '303': '.303 British',
  '.303 brit': '.303 British',
  '303 brit': '.303 British',
  '.303 british': '.303 British',
  '303 british': '.303 British',
  '.308': '.308 Winchester',
  '308': '.308 Winchester',
  '.308 win': '.308 Winchester',
  '308 win': '.308 Winchester',
  '.308 winchester': '.308 Winchester',
  '308 winchester': '.308 Winchester',
};

const aliasKey = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');

export const normalizeCaliber = (value = '') => {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return CALIBER_ALIASES[aliasKey(trimmed)] || trimmed;
};

export const caliberKey = (value = '') => normalizeCaliber(value)
  .toLowerCase()
  .replace(/winchester/g, 'win')
  .replace(/remington/g, 'rem')
  .replace(/springfield/g, '')
  .replace(/nato/g, '')
  .replace(/[^a-z0-9.]+/g, '');

export const searchCalibers = (query) => {
  if (!query || query.length < 1) return [];
  const searchLower = aliasKey(query);
  const matches = CALIBER_CATALOG.filter((cal) => {
    const calLower = aliasKey(cal);
    const aliases = Object.entries(CALIBER_ALIASES)
      .filter(([, canonical]) => canonical === cal)
      .map(([alias]) => alias);
    return calLower.includes(searchLower) || aliases.some((alias) => alias.includes(searchLower));
  });
  return [...new Set(matches)].slice(0, 10);
};