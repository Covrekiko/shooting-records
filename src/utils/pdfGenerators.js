import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export const generateReloadingBatchPDF = (session, components) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  // Header
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('Reloading Batch Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 9;

  // Date generated
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(180);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Batch info section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Batch Information', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const batchInfo = [
    ['Batch Number:', session.batch_number || '-'],
    ['Caliber:', session.caliber || '-'],
    ['Date:', format(new Date(session.date), 'MMM d, yyyy')],
    ['Quantity Loaded:', `${session.rounds_loaded || 0} rounds`],
  ];

  batchInfo.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), 55, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Components section - Table layout
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Components Used', 15, yPos);
  yPos += 7;

  // Table headers
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, pageWidth - 30, 5, 'F');
  doc.text('Component', 18, yPos);
  doc.text('Name', 50, yPos);
  doc.text('Quantity', 100, yPos);
  yPos += 6;

  // Table rows
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  if (session.components && Array.isArray(session.components)) {
    session.components.forEach((comp) => {
      const type = (comp.type || 'Unknown').charAt(0).toUpperCase() + (comp.type || 'Unknown').slice(1);
      const name = String(comp.name || '-');
      
      // Handle powder unit conversion
      let quantityStr = String(comp.quantity_used || '-');
      if (comp.type === 'powder' && comp.unit !== 'kg') {
        // If powder and not already converted, it's already in grains
        if (comp.quantity_used) {
          const grains = comp.quantity_used;
          const grams = (grains / 15.4323).toFixed(1);
          quantityStr = `${grains}gr (${grams}g)`;
        }
      } else if (comp.type === 'powder' && comp.unit === 'kg') {
        // Convert from kg back to grains (shouldn't happen but safety check)
        const grains = Math.round(comp.quantity_used * 15432.3);
        quantityStr = `${grains}gr`;
      }
      
      doc.text(String(type), 18, yPos);
      doc.text(name, 50, yPos);
      doc.text(quantityStr, 100, yPos);
      yPos += 5;
    });
  }

  yPos += 4;

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(180);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Cost section
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Cost Summary', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const costPerRound = (session.cost_per_round || 0).toFixed(2);
  const totalCost = (session.total_cost || 0).toFixed(2);

  doc.setFont(undefined, 'bold');
  doc.text('Cost per Round:', 20, yPos);
  doc.text(`£${costPerRound}`, 70, yPos);
  yPos += 6;

  doc.text('Total Batch Cost:', 20, yPos);
  doc.text(`£${totalCost}`, 70, yPos);
  yPos += 6;

  if (session.notes) {
    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 15, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(session.notes, pageWidth - 30);
    doc.text(splitNotes, 20, yPos);
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
  let yPos = 15;

  // Header
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('Ammunition Summary Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 9;

  // Date generated
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(180);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Rifles section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Rifles', 15, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  if (rifles.length === 0) {
    doc.setTextColor(100);
    doc.text('No rifles configured', 20, yPos);
    yPos += 5;
  } else {
    rifles.forEach((rifle) => {
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(`${rifle.name}`, 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(`(${rifle.caliber})`, 80, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Total rounds: ${rifle.total_rounds_fired || 0}  |  Since cleaning: ${rifle.rounds_since_cleaning || 0}`, 25, yPos);
      yPos += 4;
      doc.setFontSize(10);
      yPos += 1;
    });
  }

  yPos += 3;

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(180);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Shotguns section
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Shotguns', 15, yPos);
  yPos += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  if (shotguns.length === 0) {
    doc.setTextColor(100);
    doc.text('No shotguns configured', 20, yPos);
    yPos += 5;
  } else {
    shotguns.forEach((shotgun) => {
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(`${shotgun.name}`, 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(`(${shotgun.gauge})`, 80, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Total cartridges: ${shotgun.total_cartridges_fired || 0}`, 25, yPos);
      yPos += 4;
      doc.setFontSize(10);
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