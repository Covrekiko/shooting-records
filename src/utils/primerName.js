export function cleanPrimerName(name = '') {
  return String(name)
    .replace(/\s+(?:Large|Small)\s+(?:Rifle|Pistol)(?:\s+Magnum)?\s+Primer\s*$/i, '')
    .replace(/\s+Primer\s*$/i, '')
    .trim();
}