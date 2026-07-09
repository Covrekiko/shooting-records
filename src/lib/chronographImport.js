import { normalizeVelocityToFps } from './unitConversions.js';

export function parseChronographCsv(text, unit = 'fps') {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const values = [];
  const invalid = [];
  for (const line of lines) {
    const cells = line.split(/[,;\t]/).map((cell) => cell.trim()).filter(Boolean);
    const numericCells = cells.filter((cell) => /^\d+(\.\d+)?$/.test(cell));
    const candidate = numericCells[numericCells.length - 1];
    const fps = normalizeVelocityToFps(candidate, unit);
    if (fps) values.push(Math.round(fps * 10) / 10);
    else invalid.push(line);
  }
  return { values, invalid };
}