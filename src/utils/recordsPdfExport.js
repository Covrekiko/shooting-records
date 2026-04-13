import jsPDF from 'jspdf';

export async function generateRecordsPdf(records) {
  const doc = new jsPDF();
  return doc;
}

export async function exportRecordsToPdf(records, fileName = 'shooting-records.pdf') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;
  const margin = 15;
  const lineHeight = 5;

  // Professional Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('OFFICIAL SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80);
  doc.text('Comprehensive Activity Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setTextColor(0);

  // Report metadata
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('Report Details:', margin, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr} at ${timeStr}`, margin + 2, yPosition);
  yPosition += 3;
  doc.text(`Document Type: Shooting Records Summary`, margin + 2, yPosition);
  yPosition += 3;
  doc.text(`Total Records: ${records.length}`, margin + 2, yPosition);
  yPosition += 8;

  // Group records by type
  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  // Helper function to add a section with professional formatting
  const addSection = (title, tableData, headers, recordCount) => {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Section title with underline
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text(title, margin, yPosition);
    yPosition += 4;
    
    // Draw underline
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 4;

    // Record count
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Total Records: ${recordCount}`, margin, yPosition);
    yPosition += 5;
    doc.setTextColor(0);

    // Draw table headers with background
    doc.setFont(undefined, 'bold');
    doc.setFillColor(220, 220, 220);
    doc.setTextColor(0);
    doc.setFontSize(8);
    
    const colWidth = (pageWidth - 2 * margin) / headers.length;
    const headerHeight = lineHeight + 2;
    
    headers.forEach((header, i) => {
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight, 'F');
      doc.text(header, margin + i * colWidth + 1.5, yPosition - 1, { maxWidth: colWidth - 3, align: 'left' });
    });
    yPosition += 3;

    // Draw table data with alternating row colors
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    
    tableData.forEach((row, rowIdx) => {
      if (yPosition > pageHeight - 10) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Alternating row background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - lineHeight + 1, pageWidth - 2 * margin, lineHeight, 'F');
      }
      
      row.forEach((cell, i) => {
        doc.text(String(cell), margin + i * colWidth + 1.5, yPosition, { maxWidth: colWidth - 3, align: 'left' });
      });
      yPosition += lineHeight;
    });
    yPosition += 6;
  };

  // Target Shooting Section
  if (targetRecords.length > 0) {
    const targetData = targetRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
      r.caliber || '-',
      r.ammunition_brand || '-',
    ]);
    addSection('TARGET SHOOTING SESSIONS', targetData, ['Date', 'Check-in', 'Check-out', 'Rounds', 'Caliber', 'Ammunition'], targetRecords.length);
  }

  // Clay Shooting Section
  if (clayRecords.length > 0) {
    const clayData = clayRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
    ]);
    addSection('CLAY SHOOTING SESSIONS', clayData, ['Date', 'Check-in', 'Check-out', 'Rounds Fired'], clayRecords.length);
  }

  // Deer Management Section
  if (deerRecords.length > 0) {
    const deerData = deerRecords.map(r => [
      r.date,
      r.start_time || '-',
      r.end_time || '-',
      r.place_name || '-',
      r.deer_species || '-',
      String(r.number_shot || '0'),
      r.caliber || '-',
    ]);
    addSection('DEER MANAGEMENT ACTIVITY LOG', deerData, ['Date', 'Start', 'End', 'Location', 'Species', 'Count', 'Caliber'], deerRecords.length);
  }

  // Footer with compliance notice
  yPosition += 5;
  if (yPosition > pageHeight - 20) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont(undefined, 'italic');
  doc.text('This document is an official record of shooting activities and is suitable for regulatory compliance.', margin, yPosition, { maxWidth: pageWidth - 2 * margin, align: 'center' });
  yPosition += 4;
  doc.text(`Report Generated: ${dateStr}`, margin, yPosition, { maxWidth: pageWidth - 2 * margin, align: 'center' });

  doc.save(fileName);
}

export async function getRecordsPdfBlob(records) {
  const doc = generateBase44Pdf(records);
  return doc.output('blob');
}

function generateBase44Pdf(records) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;
  const margin = 15;
  const lineHeight = 5;

  // Professional Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('OFFICIAL SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80);
  doc.text('Comprehensive Activity Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setTextColor(0);

  // Report metadata
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('Report Details:', margin, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr} at ${timeStr}`, margin + 2, yPosition);
  yPosition += 3;
  doc.text(`Document Type: Shooting Records Summary`, margin + 2, yPosition);
  yPosition += 3;
  doc.text(`Total Records: ${records.length}`, margin + 2, yPosition);
  yPosition += 8;

  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  const addSection = (title, tableData, headers, recordCount) => {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text(title, margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 4;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Total Records: ${recordCount}`, margin, yPosition);
    yPosition += 5;
    doc.setTextColor(0);

    doc.setFont(undefined, 'bold');
    doc.setFillColor(220, 220, 220);
    doc.setTextColor(0);
    doc.setFontSize(8);
    
    const colWidth = (pageWidth - 2 * margin) / headers.length;
    const headerHeight = lineHeight + 2;
    
    headers.forEach((header, i) => {
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight, 'F');
      doc.text(header, margin + i * colWidth + 1.5, yPosition - 1, { maxWidth: colWidth - 3, align: 'left' });
    });
    yPosition += 3;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    
    tableData.forEach((row, rowIdx) => {
      if (yPosition > pageHeight - 10) {
        doc.addPage();
        yPosition = margin;
      }
      
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - lineHeight + 1, pageWidth - 2 * margin, lineHeight, 'F');
      }
      
      row.forEach((cell, i) => {
        doc.text(String(cell), margin + i * colWidth + 1.5, yPosition, { maxWidth: colWidth - 3, align: 'left' });
      });
      yPosition += lineHeight;
    });
    yPosition += 6;
  };

  if (targetRecords.length > 0) {
    const targetData = targetRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
      r.caliber || '-',
      r.ammunition_brand || '-',
    ]);
    addSection('TARGET SHOOTING SESSIONS', targetData, ['Date', 'Check-in', 'Check-out', 'Rounds', 'Caliber', 'Ammunition'], targetRecords.length);
  }

  if (clayRecords.length > 0) {
    const clayData = clayRecords.map(r => [
      r.date,
      r.checkin_time || '-',
      r.checkout_time || '-',
      String(r.rounds_fired || '-'),
    ]);
    addSection('CLAY SHOOTING SESSIONS', clayData, ['Date', 'Check-in', 'Check-out', 'Rounds Fired'], clayRecords.length);
  }

  if (deerRecords.length > 0) {
    const deerData = deerRecords.map(r => [
      r.date,
      r.start_time || '-',
      r.end_time || '-',
      r.place_name || '-',
      r.deer_species || '-',
      String(r.number_shot || '0'),
      r.caliber || '-',
    ]);
    addSection('DEER MANAGEMENT ACTIVITY LOG', deerData, ['Date', 'Start', 'End', 'Location', 'Species', 'Count', 'Caliber'], deerRecords.length);
  }

  yPosition += 5;
  if (yPosition > pageHeight - 20) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont(undefined, 'italic');
  const dateStr2 = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text('This document is an official record of shooting activities and is suitable for regulatory compliance.', margin, yPosition, { maxWidth: pageWidth - 2 * margin, align: 'center' });
  yPosition += 4;
  doc.text(`Report Generated: ${dateStr2}`, margin, yPosition, { maxWidth: pageWidth - 2 * margin, align: 'center' });

  return doc;
}