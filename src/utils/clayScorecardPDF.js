import { jsPDF } from 'jspdf';

export function exportScorecardPDF(session, stands, stats, shotgun, ammo, shotsMap = {}) {
  const doc = new jsPDF();
  let y = 20;

  const addText = (text, x, size = 10, style = 'normal', color = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(String(text), x, y);
  };

  const line = () => { y += 2; doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y); y += 6; };

  const checkPage = (needed = 10) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

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
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y);
    y += 6;
  });

  y += 4; line();

  // Summary
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
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
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y);
    y += 6;
  });

  y += 4; line();

  // Stand-by-Stand Results
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('Stand-by-Stand Results', 15, y); y += 8;

  stands.forEach((stand) => {
    const isShotByShot = stand.scoring_method === 'shot_by_shot';
    const shots = shotsMap[stand.id] || [];

    checkPage(isShotByShot ? 14 + shots.length * 6 : 22);

    // Stand header
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    const method = isShotByShot ? ' [Shot-by-Shot]' : ' [Quick Total]';
    doc.text(`Stand ${stand.stand_number} — ${stand.discipline_type}${method}`, 15, y); y += 6;

    if (isShotByShot) {
      // Shot-by-shot list
      if (shots.length === 0) {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
        doc.text('No shots recorded', 20, y); y += 5;
      } else {
        shots.forEach(shot => {
          checkPage(6);
          const isHit = shot.result === 'hit';
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          doc.setTextColor(isHit ? 0 : 180, isHit ? 130 : 0, 0);
          doc.text(`Shot ${shot.shot_number}: ${shot.result.charAt(0).toUpperCase() + shot.result.slice(1)}`, 20, y);
          y += 5;
        });
        checkPage(6);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text(`Summary: ${stand.hits}/${stand.clays_total} (${stand.hit_percentage}%)`, 20, y); y += 6;
      }
    } else {
      // Quick total rows
      const rows = [
        [`${stand.shots_used || stand.clays_total} shots`, `${stand.hits} hits`, `${stand.misses} misses`, `Score: ${stand.hits}/${stand.clays_total} (${stand.hit_percentage}%)`],
      ];
      rows.forEach(cols => {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
        cols.forEach((val, ci) => doc.text(val, 20 + ci * 42, y));
        y += 6;
      });
    }

    if (stand.notes) {
      checkPage(5);
      doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text(`Notes: ${stand.notes}`, 20, y); y += 5;
    }
    y += 2;
  });

  line();

  // Footer
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 15, y);

  doc.save(`clay-scorecard-${session.date || 'session'}.pdf`);
}