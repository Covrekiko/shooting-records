import { jsPDF } from 'jspdf';

export function exportScorecardPDF(session, stands, stats, shotgun, ammo, shotsMap = {}) {
  const doc = new jsPDF();
  let y = 20;

  const checkPage = (needed = 10) => { if (y + needed > 280) { doc.addPage(); y = 20; } };

  // Header
  doc.setFillColor(28, 85, 67);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('Clay Shooting Scorecard', 15, 13);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${session.location_name || 'Clay Ground'} · ${session.date || ''}`, 15, 22);
  y = 38;

  // Session details
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('Session Details', 15, y); y += 8;
  [
    ['Club / Ground', session.location_name || '—'],
    ['Date', session.date || '—'],
    ['Check-in', session.checkin_time || session.start_time || '—'],
    ['Check-out', session.checkout_time || session.end_time || '—'],
    ['Shotgun', shotgun ? shotgun.name : '—'],
    ['Cartridge', ammo ? `${ammo.brand}${ammo.caliber ? ` (${ammo.caliber})` : ''}` : (session.ammunition_used || '—')],
  ].forEach(([label, value]) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y); y += 6;
  });

  y += 4; doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y); y += 8;

  // Score Summary
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('Score Summary', 15, y); y += 8;
  [
    ['Total Stands', String(stats.totalStands)],
    ['Total Hits', String(stats.totalHits)],
    ['Total Misses', String(stats.totalMisses)],
    ['Total No Birds', String(stats.totalNoBirds)],
    ['Valid Scored Clays', String(stats.totalValidScored)],
    ['Final Score', `${stats.totalHits}/${stats.totalValidScored}`],
    ['Cartridges Used', String(stats.totalCartridges)],
    ['Hit Percentage', `${stats.hitPct}%`],
    ['Best Stand', stats.bestStand ? `Stand ${stats.bestStand.stand_number}` : '—'],
    ['Worst Stand', stats.worstStand && stats.worstStand.id !== stats.bestStand?.id ? `Stand ${stats.worstStand.stand_number}` : '—'],
  ].forEach(([label, value]) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(value, 70, y); y += 6;
  });

  y += 4; doc.line(15, y, 195, y); y += 8;

  // Stand-by-Stand
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('Stand-by-Stand Results', 15, y); y += 8;

  stands.forEach((stand) => {
    const isSbs = stand.scoring_method === 'shot_by_shot';
    const shots = shotsMap[stand.id] || [];
    const valid = (stand.hits || 0) + (stand.misses || 0);
    checkPage(isSbs ? 16 + shots.length * 5 : 28);

    // Stand header
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    const method = isSbs ? ' [Shot-by-Shot]' : ' [Quick Total]';
    doc.text(`Stand ${stand.stand_number} — ${stand.discipline_type}${method}`, 15, y); y += 6;

    if (isSbs) {
      if (shots.length === 0) {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
        doc.text('No shots recorded', 20, y); y += 5;
      } else {
        shots.forEach(shot => {
          checkPage(5);
          const isHit = shot.result === 'hit';
          const isNb = shot.result === 'no_bird';
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          if (isHit) doc.setTextColor(0, 140, 60);
          else if (isNb) doc.setTextColor(180, 120, 0);
          else doc.setTextColor(180, 40, 40);
          const label = isHit ? 'Hit' : isNb ? 'No Bird' : 'Miss';
          doc.text(`Shot ${shot.shot_number}: ${label}`, 20, y); y += 5;
        });
        checkPage(8);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text(`Hits: ${stand.hits || 0}  Misses: ${stand.misses || 0}  No Birds: ${stand.no_birds || 0}`, 20, y); y += 5;
        doc.text(`Score: ${stand.hits || 0}/${valid} · Hit rate: ${stand.hit_percentage || 0}%`, 20, y); y += 6;
      }
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      doc.text(`${stand.shots_used || valid} shots used`, 20, y); y += 5;
      doc.setTextColor(0, 140, 60); doc.text(`Hits: ${stand.hits || 0}`, 20, y);
      doc.setTextColor(180, 40, 40); doc.text(`Misses: ${stand.misses || 0}`, 55, y);
      doc.setTextColor(180, 120, 0); doc.text(`No Birds: ${stand.no_birds || 0}`, 95, y);
      doc.setTextColor(30, 30, 30); y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Score: ${stand.hits || 0}/${valid} · Hit rate: ${stand.hit_percentage || 0}%`, 20, y); y += 6;
    }

    if (stand.notes) {
      checkPage(5);
      doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic');
      doc.text(`Notes: ${stand.notes}`, 20, y); y += 5;
    }
    y += 2;
  });

  doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y); y += 6;
  doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 15, y);

  doc.save(`clay-scorecard-${session.date || 'session'}.pdf`);
}