import jsPDF from 'jspdf';

export async function exportRecordsToPdf(records, fileName = 'shooting-records.pdf') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 20;
  const lineHeight = 7;

  // Title
  doc.setFontSize(20);
  doc.text('Shooting Records Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date of report
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;
  doc.setTextColor(0);

  // Group records by type
  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  // Helper function to add a section
  const addSection = (title, tableData, headers) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, yPosition);
    yPosition += 10;

    // Draw table headers
    doc.setFont(undefined, 'bold');
    doc.setFillColor(30, 100, 45);
    doc.setTextColor(255);
    
    const colWidth = (pageWidth - 2 * margin) / headers.length;
    headers.forEach((header, i) => {
      doc.text(header, margin + i * colWidth + 2, yPosition, { maxWidth: colWidth - 4 });
    });
    yPosition += lineHeight + 1;

    // Draw table data
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    tableData.forEach(row => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = margin;
      }
      row.forEach((cell, i) => {
        doc.text(String(cell), margin + i * colWidth + 2, yPosition, { maxWidth: colWidth - 4 });
      });
      yPosition += lineHeight;
    });
    yPosition += 5;
  };

  // Target Shooting Section
  if (targetRecords.length > 0) {
    const targetData = targetRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
      r.ammunition_brand || '-',
    ]);
    addSection('Target Shooting Sessions', targetData, ['Date', 'Check-in', 'Check-out', 'Rounds', 'Ammo']);
  }

  // Clay Shooting Section
  if (clayRecords.length > 0) {
    const clayData = clayRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
    ]);
    addSection('Clay Shooting Sessions', clayData, ['Date', 'Check-in', 'Check-out', 'Rounds']);
  }

  // Deer Management Section
  if (deerRecords.length > 0) {
    const deerData = deerRecords.map(r => [
      r.date,
      r.start_time || '-',
      r.end_time || '-',
      r.deer_species || '-',
      String(r.number_shot || '-'),
    ]);
    addSection('Deer Management Outings', deerData, ['Date', 'Start', 'End', 'Species', 'Qty']);
  }

  doc.save(fileName);
}