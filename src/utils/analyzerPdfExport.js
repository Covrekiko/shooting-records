import { jsPDF } from 'jspdf';

function fd(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function drawTable(doc, headers, rows, x, y, colWidths, rowH = 7) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  doc.setFillColor(40, 40, 40);
  doc.rect(x, y, totalW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let cx = x;
  headers.forEach((h, i) => {
    doc.text(String(h), cx + 1, y + rowH - 2);
    cx += colWidths[i];
  });
  y += rowH;
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) { doc.setFillColor(248, 248, 250); doc.rect(x, y, totalW, rowH, 'F'); }
    doc.setTextColor(0, 0, 0);
    cx = x;
    row.forEach((cell, i) => {
      const txt = String(cell ?? '—').slice(0, Math.floor(colWidths[i] / 2.2));
      doc.text(txt, cx + 1, y + rowH - 2);
      cx += colWidths[i];
    });
    y += rowH;
  });
  doc.setDrawColor(200, 200, 200);
  doc.rect(x, y - (rows.length + 1) * rowH, totalW, (rows.length + 1) * rowH);
  return y;
}

export function exportSessionPDF(session, groups, scopeProfile) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TARGET SESSION REPORT', pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fd(session.date)} · ${session.range_name || 'No range'} · ${session.distance}${session.distance_unit || 'm'}`, pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(200);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  const info = [
    ['Rifle:', session.rifle_name || '—', 'Scope:', session.scope_name || '—'],
    ['Ammunition:', session.ammo_name || '—', 'Calibre:', session.caliber || '—'],
    ['Bullet Weight:', session.bullet_weight || '—', 'Position:', session.shooting_position?.replace('_', ' ') || '—'],
    ['Temperature:', session.temperature || '—', 'Wind:', `${session.wind_speed || ''} ${session.wind_direction || ''}`.trim() || '—'],
  ];

  doc.setFontSize(9);
  for (const row of info) {
    doc.setFont('helvetica', 'bold'); doc.text(row[0], 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(row[1]), 42, y);
    doc.setFont('helvetica', 'bold'); doc.text(row[2], pageW / 2 + 4, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(row[3]), pageW / 2 + 32, y);
    y += 6;
  }

  if (session.weather_notes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Conditions: ${session.weather_notes}`, 14, y);
    y += 6;
  }

  if (session.notes) {
    doc.setFont('helvetica', 'italic');
    const lines = doc.splitTextToSize(`Notes: ${session.notes}`, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }

  y += 2;
  doc.setDrawColor(200);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  if (groups.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TARGET GROUPS', 14, y);
    y += 6;

    const headers = ['Group', 'Shots', 'MOA', 'MRAD', 'mm', 'inches', 'POI X', 'POI Y', 'Elev', 'Wind', 'Notes'];
    const colWidths = [22, 10, 12, 12, 10, 12, 12, 12, 12, 12, 32];
    const rows = groups.map(g => [
      g.group_name || '—',
      g.number_of_shots || '—',
      g.group_size_moa?.toFixed(2) || '—',
      g.group_size_mrad?.toFixed(3) || '—',
      g.group_size_mm || '—',
      g.group_size_inches?.toFixed(2) || '—',
      g.point_of_impact_x !== undefined ? g.point_of_impact_x : '—',
      g.point_of_impact_y !== undefined ? g.point_of_impact_y : '—',
      g.clicks_up_down !== undefined ? g.clicks_up_down : '—',
      g.clicks_left_right !== undefined ? g.clicks_left_right : '—',
      g.notes || '—',
    ]);
    y = drawTable(doc, headers, rows, 14, y, colWidths);
    y += 8;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages} | Shooting Records App | Generated ${new Date().toLocaleDateString('en-GB')}`, pageW / 2, 290, { align: 'center' });
  }

  const fname = `session-${session.rifle_name || 'rifle'}-${session.date || 'date'}-${session.distance}${session.distance_unit || 'm'}.pdf`
    .replace(/\s+/g, '-').toLowerCase();
  doc.save(fname);
}

export function exportRifleHistoryPDF(rifle, rifleSessions, groups) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RIFLE ACCURACY HISTORY', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rifle.name} · ${rifle.caliber || ''}`, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(200);
  doc.line(14, y, pageW - 14, y);
  y += 8;

  if (rifleSessions.length > 0) {
    const headers = ['Date', 'Range', 'Distance', 'Ammo', 'Best MOA', 'Avg MOA', 'Groups'];
    const colWidths = [24, 32, 20, 36, 20, 20, 16];
    const rows = rifleSessions.map(s => {
      const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
      const best = sg.length ? Math.min(...sg.map(g => g.group_size_moa)).toFixed(2) : '—';
      const avg = sg.length ? (sg.reduce((sum, g) => sum + g.group_size_moa, 0) / sg.length).toFixed(2) : '—';
      return [fd(s.date), s.range_name || '—', `${s.distance}${s.distance_unit || 'm'}`, s.ammo_name || '—', best, avg, sg.length];
    });
    y = drawTable(doc, headers, rows, 14, y, colWidths);
    y += 10;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages} | Shooting Records App`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`rifle-history-${rifle.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}