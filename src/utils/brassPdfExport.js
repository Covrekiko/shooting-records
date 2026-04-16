import jsPDF from 'jspdf';
import { format } from 'date-fns';

/**
 * Generate and download a PDF report for a single brass batch component.
 * @param {object} brass - ReloadingComponent record (brass)
 */
export function downloadBrassBatchPdf(brass) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  const line = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const field = (label, value, bold = false) => {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    if (bold) doc.setFont(undefined, 'bold');
    doc.text(String(value ?? '—'), margin + 55, y);
    if (bold) doc.setFont(undefined, 'normal');
    y += 8;
  };

  // ── Header ──
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Brass Batch Report', margin, 14);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, margin, 24);
  y = 44;

  // ── Batch identity ──
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  doc.text(brass.name || 'Brass Batch', margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(brass.is_used_brass ? 'USED / PREVIOUSLY FIRED BRASS' : 'NEW BRASS', margin, y);
  y += 8;

  line();

  // ── Details ──
  doc.setFont(undefined, 'normal');
  field('Batch Number', brass.batch_number, true);
  field('Brand', brass.brand);
  field('Caliber', brass.caliber);
  field('Date Acquired', brass.date_acquired ? format(new Date(brass.date_acquired), 'dd MMM yyyy') : '—');
  field('Quantity Total', `${brass.quantity_total} pieces`);
  field('Quantity Remaining', `${brass.quantity_remaining ?? brass.quantity_total} pieces`);
  field('Quantity Used', `${(brass.quantity_total || 0) - (brass.quantity_remaining ?? brass.quantity_total)} pieces`);
  field('Cost per Unit', `£${(brass.cost_per_unit || 0).toFixed(4)}`);
  field('Total Cost', `£${(brass.price_total || 0).toFixed(2)}`);

  y += 2;
  line();

  // ── Reload lifecycle ──
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  doc.text('Reload Lifecycle', margin, y);
  y += 8;
  doc.setFont(undefined, 'normal');

  field('Times Reloaded', brass.times_reloaded ?? 0, true);
  field('Max Reload Limit', brass.max_reloads > 0 ? brass.max_reloads : 'No limit');
  field('Reloads Remaining', brass.max_reloads > 0
    ? Math.max(0, brass.max_reloads - (brass.times_reloaded || 0))
    : 'Unlimited');
  field('Times Fired (manual)', brass.times_fired ?? 0);

  if (brass.max_reloads > 0 && (brass.times_reloaded || 0) >= brass.max_reloads) {
    y += 2;
    doc.setFillColor(255, 235, 235);
    doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(200, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text('⚠  Reload limit reached — retire or trim this brass before further use.', margin + 3, y + 7);
    doc.setFont(undefined, 'normal');
    y += 16;
  }

  y += 2;
  line();

  // ── Notes ──
  if (brass.notes) {
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('Notes', margin, y);
    y += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(brass.notes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 4;
    line();
  }

  // ── Footer ──
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Batch ID: ${brass.id || 'N/A'}`, margin, doc.internal.pageSize.getHeight() - 10);
  doc.text('Shooting Records App', pageW - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  const safeName = (brass.batch_number || brass.name || 'brass').replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeName}.pdf`);
}