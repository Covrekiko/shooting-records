import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export const generateReloadingBatchPDF = (session, components) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.text('Reloading Batch Report', 20, yPos);
  yPos += 10;

  // Date generated
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 20, yPos);
  yPos += 8;

  // Batch info section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Batch Information', 20, yPos);
  yPos += 6;

  doc.setFontSize(10);
  const batchInfo = [
    ['Batch Number:', session.batch_number || '-'],
    ['Caliber:', session.caliber || '-'],
    ['Date:', format(new Date(session.date), 'MMM d, yyyy')],
    ['Quantity Loaded:', `${session.rounds_loaded || 0} rounds`],
  ];

  batchInfo.forEach(([label, value]) => {
    doc.text(label, 25, yPos);
    doc.text(String(value), 70, yPos);
    yPos += 5;
  });

  yPos += 3;

  // Components section
  doc.setFontSize(12);
  doc.text('Components Used', 20, yPos);
  yPos += 6;

  doc.setFontSize(10);
  if (session.components && Array.isArray(session.components)) {
    session.components.forEach((comp) => {
      doc.text(`• ${comp.type || 'Unknown'}:`, 25, yPos);
      yPos += 4;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`  Name: ${comp.name || '-'}`, 30, yPos);
      yPos += 3;
      doc.text(`  Quantity: ${comp.quantity_used || '-'}`, 30, yPos);
      yPos += 3;
      if (comp.unit) {
        doc.text(`  Unit: ${comp.unit}`, 30, yPos);
        yPos += 3;
      }
      doc.setTextColor(0);
      doc.setFontSize(10);
      yPos += 2;
    });
  }

  yPos += 3;

  // Cost section
  doc.setFontSize(12);
  doc.text('Cost Information', 20, yPos);
  yPos += 6;

  doc.setFontSize(10);
  const costInfo = [
    ['Cost per Round:', `£${(session.cost_per_round || 0).toFixed(4)}`],
    ['Total Batch Cost:', `£${(session.total_cost || 0).toFixed(2)}`],
  ];

  costInfo.forEach(([label, value]) => {
    doc.text(label, 25, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(String(value), 70, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 5;
  });

  if (session.notes) {
    yPos += 5;
    doc.setFontSize(10);
    doc.text('Notes:', 20, yPos);
    yPos += 4;
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(session.notes, pageWidth - 40);
    doc.text(splitNotes, 25, yPos);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc;
};

export const generateAmmunitionSummaryPDF = (rifles, shotguns) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.text('Ammunition Summary Report', 20, yPos);
  yPos += 10;

  // Date generated
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 20, yPos);
  yPos += 8;

  // Rifles section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Rifles', 20, yPos);
  yPos += 6;

  doc.setFontSize(9);
  if (rifles.length === 0) {
    doc.setTextColor(100);
    doc.text('No rifles configured', 25, yPos);
    yPos += 4;
  } else {
    rifles.forEach((rifle) => {
      doc.setTextColor(0);
      doc.text(`${rifle.name} (${rifle.caliber})`, 25, yPos);
      yPos += 3;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Total rounds: ${rifle.total_rounds_fired || 0}`, 30, yPos);
      yPos += 2;
      doc.text(`Since cleaning: ${rifle.rounds_since_cleaning || 0}`, 30, yPos);
      yPos += 2;
      doc.setFontSize(9);
      yPos += 1;
    });
  }

  yPos += 3;

  // Shotguns section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text('Shotguns', 20, yPos);
  yPos += 6;

  doc.setFontSize(9);
  if (shotguns.length === 0) {
    doc.setTextColor(100);
    doc.text('No shotguns configured', 25, yPos);
    yPos += 4;
  } else {
    shotguns.forEach((shotgun) => {
      doc.setTextColor(0);
      doc.text(`${shotgun.name} (${shotgun.gauge})`, 25, yPos);
      yPos += 3;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Total cartridges: ${shotgun.total_cartridges_fired || 0}`, 30, yPos);
      yPos += 2;
      doc.setFontSize(9);
      yPos += 1;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc;
};

export const generateAmmunitionInventoryPDF = (ammunition) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.text('Ammunition Inventory Report', 20, yPos);
  yPos += 10;

  // Date generated
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 20, yPos);
  yPos += 8;

  // Summary
  const totalValue = ammunition.reduce((sum, a) => sum + ((a.quantity_in_stock || 0) * (a.cost_per_unit || 0)), 0);
  const totalRounds = ammunition.reduce((sum, a) => sum + (a.quantity_in_stock || 0), 0);

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(`Total Items: ${ammunition.length} | Total Rounds: ${totalRounds} | Total Value: £${totalValue.toFixed(2)}`, 20, yPos);
  yPos += 8;

  // Ammunition list
  doc.setFontSize(9);
  ammunition.forEach((ammo) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(`${ammo.brand} - ${ammo.caliber || 'N/A'}`, 20, yPos);
    yPos += 4;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    const itemValue = (ammo.quantity_in_stock || 0) * (ammo.cost_per_unit || 0);
    doc.text(`Bullet Type: ${ammo.bullet_type || '-'} | Grain: ${ammo.grain || '-'}`, 25, yPos);
    yPos += 3;
    doc.text(`Quantity: ${ammo.quantity_in_stock || 0} | Cost/Unit: £${(ammo.cost_per_unit || 0).toFixed(4)} | Total Value: £${itemValue.toFixed(2)}`, 25, yPos);
    yPos += 3;
    if (ammo.date_purchased) {
      doc.text(`Purchased: ${format(new Date(ammo.date_purchased), 'MMM d, yyyy')}`, 25, yPos);
      yPos += 3;
    }
    if (ammo.notes) {
      doc.text(`Notes: ${ammo.notes}`, 25, yPos);
      yPos += 3;
    }
    yPos += 2;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc;
};