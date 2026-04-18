import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export const generateLoadTestPDF = (test, variants, results) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const checkPage = (needed = 20) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const sectionHeader = (title) => {
    checkPage(14);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(title, 15, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.setDrawColor(180);
    doc.line(15, y, pageWidth - 15, y);
    y += 6;
  };

  const row = (label, value, indent = 20) => {
    if (!value && value !== 0) return;
    checkPage(6);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80);
    doc.text(String(label), indent, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(String(value), indent + 50, y);
    y += 5.5;
  };

  // ── HEADER ──
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('Load Development Report', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setLineWidth(0.4);
  doc.setDrawColor(150);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // ── TEST OVERVIEW ──
  sectionHeader('Test Overview');
  doc.setTextColor(0);
  [
    ['Test Name:', test.name],
    ['Test Type:', test.test_type],
    ['Status:', test.status],
    ['Caliber:', test.caliber],
    ['Rifle:', test.rifle_name],
    ['Bullet:', [test.bullet_brand, test.bullet_model, test.bullet_weight].filter(Boolean).join(' ')],
    ['Brass:', test.brass_brand],
    ['Primer:', [test.primer_brand, test.primer_model].filter(Boolean).join(' ')],
    ['Powder:', test.powder_name],
    ['Test Date:', test.test_date ? format(new Date(test.test_date), 'MMM d, yyyy') : null],
    ['Range Date:', test.range_date ? format(new Date(test.range_date), 'MMM d, yyyy') : null],
    ['Variants:', variants.length],
  ].forEach(([l, v]) => row(l, v));

  if (test.notes) {
    checkPage(12);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80);
    doc.text('Notes:', 20, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    const split = doc.splitTextToSize(test.notes, pageWidth - 40);
    doc.text(split, 20, y);
    y += split.length * 5 + 4;
  }

  y += 4;

  // ── VARIANTS ──
  sectionHeader(`Test Variants (${variants.length})`);

  variants.forEach((v, idx) => {
    const result = results.find(r => r.variant_id === v.id);
    const isBest = result?.is_best;

    checkPage(40);
    y += 2;

    // Variant header box
    doc.setFillColor(isBest ? 240 : 248, isBest ? 253 : 248, isBest ? 244 : 248);
    doc.setDrawColor(isBest ? 110 : 200, isBest ? 180 : 200, isBest ? 120 : 200);
    doc.setLineWidth(0.4);
    doc.rect(15, y - 4, pageWidth - 30, 8, 'FD');

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${idx + 1}. ${v.label}${isBest ? '  ★ BEST' : ''}`, 18, y);
    y += 8;

    doc.setTextColor(0);
    [
      ['Powder:', v.powder_name ? `${v.powder_name}${v.powder_charge_grains ? ` — ${v.powder_charge_grains}gr` : ''}` : null],
      ['Rounds:', v.round_count > 0 ? v.round_count : null],
      ['Bullet:', v.bullet_brand],
      ['Primer:', v.primer_brand],
      ['Brass:', v.brass_brand],
      ['OAL:', v.coal_oal],
      ['CBTO:', v.cbto],
      ['Seating Depth:', v.seating_depth],
      ['Bullet Jump:', v.bullet_jump],
      ['Annealed:', v.annealed ? 'Yes' : null],
      ['Case Prep:', v.case_prep_notes],
    ].forEach(([l, val]) => row(l, val, 22));

    if (v.notes) {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(100);
      const split = doc.splitTextToSize(`Notes: ${v.notes}`, pageWidth - 50);
      doc.text(split, 22, y);
      y += split.length * 4.5;
    }

    // Results section for this variant
    if (result?.tested) {
      checkPage(30);
      y += 2;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(60, 120, 60);
      doc.text('Results:', 22, y);
      y += 5;
      doc.setTextColor(0);

      [
        ['Avg Velocity:', result.avg_velocity ? `${result.avg_velocity} fps` : null],
        ['ES:', result.es],
        ['SD:', result.sd],
        ['Group Size:', result.group_size_moa ? `${result.group_size_moa} MOA` : (result.group_size_mm ? `${result.group_size_mm}mm` : null)],
        ['Distance:', result.distance_yards ? `${result.distance_yards} yds` : null],
        ['Pressure Signs:', result.pressure_signs_notes],
        ['Accuracy Notes:', result.accuracy_notes],
        ['Recoil Notes:', result.recoil_notes],
        ['Final Comments:', result.final_comments],
      ].forEach(([l, val]) => {
        if (!val) return;
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(80);
        doc.text(String(l), 24, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        const split = doc.splitTextToSize(String(val), pageWidth - 85);
        doc.text(split, 62, y);
        y += split.length * 4.5 + 0.5;
      });

      // Velocity string
      const vels = [result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5]
        .filter(Boolean).join(' / ');
      if (vels) {
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(80);
        doc.text('Velocities:', 24, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.text(vels + ' fps', 62, y);
        y += 5;
      }
    } else {
      checkPage(6);
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(150);
      doc.text('No results recorded', 22, y);
      y += 5;
    }

    y += 4;
  });

  // ── SUMMARY ──
  checkPage(30);
  sectionHeader('Summary');
  const bestVariant = variants.find(v => results.find(r => r.variant_id === v.id && r.is_best));
  const testedCount = results.filter(r => r.tested).length;
  row('Total Variants:', variants.length);
  row('Variants Tested:', testedCount);
  row('Total Rounds:', variants.reduce((s, v) => s + (v.round_count || 0), 0));
  if (bestVariant) {
    checkPage(8);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(60, 120, 60);
    doc.text('Best Load:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(bestVariant.label, 70, y);
    y += 6;
  }

  // ── FOOTER ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Load Development Report — ${test.name} — Page ${i} of ${pageCount}`,
      pageWidth / 2, pageHeight - 8, { align: 'center' }
    );
  }

  return doc;
};