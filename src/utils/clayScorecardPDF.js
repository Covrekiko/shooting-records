import { jsPDF } from 'jspdf';

export function exportScorecardPDF(session, stands, stats, shotgun, ammo) {
  const doc = new jsPDF();
  let y = 20;

  const addText = (text, x, size = 10, style = 'normal', color = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(String(text), x, y);
  };

  const line = () => { y += 2; doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y); y += 6; };

  // Header
  doc.setFillColor(28, 85, 67);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Clay Shooting Scorecard', 15, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${session.location_name || 'Clay Ground'} · ${session.date || ''}`, 15, 22);
  y = 38;

  // Session details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Session Details', 15, y); y += 8;

  const details = [
    ['Club / Ground', session.location_name || '—'],
    ['Date', session.date || '—'],
    ['Check-in', session.checkin_time || session.start_time || '—'],
    ['Check-out', session.checkout_time || session.end_time || '—'],
    ['Shotgun', shotgun ? shotgun.name : '—'],
    ['Cartridge', ammo ? `${ammo.brand}${ammo.caliber ? ` (${ammo.caliber})` : ''}` : (session.ammunition_used || '—')],
  ];

  details.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y);
    y += 6;
  });

  y += 4; line();

  // Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Score Summary', 15, y); y += 8;

  const summaryItems = [
    ['Total Stands', String(stats.totalStands)],
    ['Total Clays', String(stats.totalClays)],
    ['Total Hits', String(stats.totalHits)],
    ['Total Misses', String(stats.totalMisses)],
    ['Cartridges Used', String(stats.totalCartridges)],
    ['Hit Percentage', `${stats.hitPct}%`],
    ['Best Stand', stats.bestStand ? `Stand ${stats.bestStand.stand_number} (${stats.bestStand.hits}/${stats.bestStand.clays_total})` : '—'],
    ['Worst Stand', stats.worstStand ? `Stand ${stats.worstStand.stand_number} (${stats.worstStand.hits}/${stats.worstStand.clays_total})` : '—'],
  ];

  summaryItems.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y);
    y += 6;
  });

  y += 4; line();

  // Stands table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Stand-by-Stand Results', 15, y); y += 8;

  // Table header
  const cols = [15, 35, 70, 95, 110, 125, 155];
  const headers = ['Stand', 'Discipline', 'Clays', 'Hits', 'Misses', 'Shots', 'Hit %'];
  doc.setFillColor(240, 240, 240);
  doc.rect(12, y - 4, 186, 7, 'F');
  headers.forEach((h, i) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(h, cols[i], y);
  });
  y += 7;

  stands.forEach((stand, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(12, y - 4, 186, 7, 'F');
    }
    const row = [
      `Stand ${stand.stand_number}`,
      stand.discipline_type || '—',
      String(stand.clays_total || 0),
      String(stand.hits || 0),
      String(stand.misses || 0),
      String(stand.shots_used || 0),
      `${stand.hit_percentage || 0}%`,
    ];
    row.forEach((val, i) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(val, cols[i], y);
    });
    y += 7;

    if (stand.notes) {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`  Notes: ${stand.notes}`, 15, y);
      y += 5;
    }
  });

  y += 4; line();

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 15, y);

  doc.save(`clay-scorecard-${session.date || 'session'}.pdf`);
}