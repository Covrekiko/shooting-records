import { jsPDF } from 'jspdf';

const PRIMARY = [180, 90, 30];
const DARK = [30, 35, 50];
const LIGHT = [248, 248, 250];

function header(doc, title) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Shooting Records', 14, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 17);
  doc.text(new Date().toLocaleDateString('en-GB'), 196, 17, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  return 28;
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), 18, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 11;
}

function kv(doc, label, value, x, y, w = 85) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value || '—'), x, y + 4);
  return y + 9;
}

function twoCol(doc, pairs, y) {
  let maxY = y;
  pairs.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? 14 : 110;
    const row = Math.floor(i / 2);
    const rowY = y + row * 9;
    kv(doc, label, value, x, rowY);
    if (rowY + 9 > maxY) maxY = rowY + 9;
  });
  return maxY + 4;
}

export function generateSessionPDF(session, groups) {
  const doc = new jsPDF();
  let y = header(doc, 'Target Session Report');

  y = sectionTitle(doc, 'Session Details', y);
  y = twoCol(doc, [
    ['Date', session.date],
    ['Range', session.range_name],
    ['Rifle', session.rifle_name],
    ['Scope', session.scope_name],
    ['Ammunition', session.ammo_name],
    ['Distance', `${session.distance}${session.distance_unit}`],
    ['Calibre', session.caliber],
    ['Position', session.shooting_position?.replace('_', ' ')],
    ['Temperature', session.temperature],
    ['Wind', `${session.wind_speed || ''} ${session.wind_direction || ''}`.trim()],
  ], y);

  if (session.weather_notes || session.notes) {
    y = sectionTitle(doc, 'Notes', y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (session.weather_notes) { doc.text(`Weather: ${session.weather_notes}`, 14, y); y += 5; }
    if (session.notes) { doc.text(`Notes: ${session.notes}`, 14, y); y += 5; }
    y += 4;
  }

  if (groups.length > 0) {
    y = sectionTitle(doc, 'Target Groups', y);
    groups.forEach((g, i) => {
      if (y > 260) { doc.addPage(); y = 14; }
      doc.setFillColor(...LIGHT);
      doc.roundedRect(14, y, 182, 26, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${g.group_name}${g.best_group ? ' ★' : ''}`, 18, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const stats = [
        g.group_size_mm ? `${g.group_size_mm}mm` : null,
        g.group_size_moa ? `${g.group_size_moa.toFixed(2)} MOA` : null,
        g.group_size_mrad ? `${g.group_size_mrad.toFixed(3)} MRAD` : null,
        g.group_size_inches ? `${g.group_size_inches.toFixed(2)}"` : null,
        g.number_of_shots ? `${g.number_of_shots} shots` : null,
      ].filter(Boolean).join('  ·  ');
      doc.text(stats, 18, y + 13);
      const corr = [
        g.clicks_up_down ? `${Math.abs(g.clicks_up_down).toFixed(1)} clicks ${g.clicks_up_down > 0 ? 'up' : 'down'}` : null,
        g.clicks_left_right ? `${Math.abs(g.clicks_left_right).toFixed(1)} clicks ${g.clicks_left_right > 0 ? 'right' : 'left'}` : null,
      ].filter(Boolean).join('  ');
      if (corr) { doc.setTextColor(...PRIMARY); doc.text(`Correction: ${corr}`, 18, y + 20); doc.setTextColor(0, 0, 0); }
      y += 30;
    });
  }

  doc.save(`target-session-${session.date}.pdf`);
}

export function generateRifleHistoryPDF(rifle, sessions, groups) {
  const doc = new jsPDF();
  const rifleName = rifle.name || `${rifle.make} ${rifle.model}`;
  let y = header(doc, `Rifle Accuracy History — ${rifleName}`);

  // Summary
  const moas = groups.filter(g => g.group_size_moa).map(g => g.group_size_moa);
  const bestMoa = moas.length ? Math.min(...moas) : null;
  const avgMoa = moas.length ? moas.reduce((a, b) => a + b, 0) / moas.length : null;

  y = sectionTitle(doc, 'Rifle Details', y);
  y = twoCol(doc, [
    ['Rifle', rifleName],
    ['Calibre', rifle.caliber],
    ['Total Sessions', sessions.length],
    ['Best Group (MOA)', bestMoa?.toFixed(2)],
    ['Average MOA', avgMoa?.toFixed(2)],
    ['Serial', rifle.serial_number],
  ], y);

  if (sessions.length > 0) {
    y = sectionTitle(doc, 'Sessions', y);
    sessions.slice(0, 20).forEach(s => {
      if (y > 270) { doc.addPage(); y = 14; }
      const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
      const best = sg.length ? Math.min(...sg.map(g => g.group_size_moa)).toFixed(2) : '—';
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.date}  ${s.distance}${s.distance_unit}  ${s.range_name || ''}`, 14, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Best: ${best} MOA`, 160, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 7;
    });
  }

  doc.save(`rifle-history-${rifleName.replace(/\s+/g, '-')}.pdf`);
}

export function generateAmmoComparisonPDF(sessions, groups, rifles) {
  const doc = new jsPDF();
  let y = header(doc, 'Ammunition Comparison Report');

  const ammoMap = {};
  sessions.forEach(s => {
    if (!s.ammo_name) return;
    if (!ammoMap[s.ammo_name]) ammoMap[s.ammo_name] = { moas: [], sessions: 0 };
    ammoMap[s.ammo_name].sessions++;
    const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
    sg.forEach(g => ammoMap[s.ammo_name].moas.push(g.group_size_moa));
  });

  const rows = Object.entries(ammoMap).map(([name, data]) => ({
    name,
    sessions: data.sessions,
    groups: data.moas.length,
    best: data.moas.length ? Math.min(...data.moas).toFixed(2) : '—',
    avg: data.moas.length ? (data.moas.reduce((a, b) => a + b, 0) / data.moas.length).toFixed(2) : '—',
  })).sort((a, b) => parseFloat(a.best) - parseFloat(b.best));

  y = sectionTitle(doc, 'Ammunition Performance', y);

  // Table header
  doc.setFillColor(220, 220, 225);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Ammunition', 16, y + 5);
  doc.text('Sessions', 110, y + 5);
  doc.text('Best MOA', 135, y + 5);
  doc.text('Avg MOA', 162, y + 5);
  y += 9;

  rows.forEach((row, i) => {
    if (y > 270) { doc.addPage(); y = 14; }
    if (i === 0) {
      doc.setFillColor(255, 251, 230);
      doc.rect(14, y, 182, 7, 'F');
    } else if (i % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(14, y, 182, 7, 'F');
    }
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(row.name.slice(0, 45), 16, y + 5);
    doc.text(String(row.sessions), 110, y + 5);
    doc.text(row.best, 135, y + 5);
    doc.text(row.avg, 162, y + 5);
    if (i === 0) { doc.setTextColor(...PRIMARY); doc.text(' ★', 190, y + 5); doc.setTextColor(0, 0, 0); }
    y += 8;
  });

  doc.save('ammo-comparison.pdf');
}