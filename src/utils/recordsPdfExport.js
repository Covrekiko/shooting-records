import jsPDF from 'jspdf';

export async function generateRecordsPdf(records) {
  const doc = new jsPDF();
  return doc;
}

export async function exportRecordsToPdf(records, userInfo = null, fileName = 'shooting-records.pdf', rifles = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 10;
  const margin = 15;
  const lineHeight = 5;

  // Professional Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(20, 60, 40);
  doc.text('OFFICIAL SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text('Comprehensive Activity Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // User Information Header Box
  if (userInfo) {
    doc.setDrawColor(20, 60, 40);
    doc.setFillColor(240, 248, 245);
    doc.rect(margin, yPosition - 1, pageWidth - 2 * margin, 20, 'F');
    doc.rect(margin, yPosition - 1, pageWidth - 2 * margin, 20);
    
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('PARTICIPANT INFORMATION', margin + 3, yPosition + 2);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    yPosition += 6;
    
    doc.text(`Name: ${userInfo.full_name || 'N/A'}`, margin + 3, yPosition);
    yPosition += 4;
    
    if (userInfo.date_of_birth) {
      const dob = new Date(userInfo.date_of_birth);
      const dobStr = dob.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date of Birth: ${dobStr}`, margin + 3, yPosition);
    } else {
      doc.text(`Date of Birth: N/A`, margin + 3, yPosition);
    }
    yPosition += 4;
    
    doc.text(`Address: ${userInfo.address || 'N/A'}`, margin + 3, yPosition, { maxWidth: pageWidth - 2 * margin - 6 });
    yPosition += 8;
  }
  
  yPosition += 3;
  
  // Report metadata
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(20, 60, 40);
  doc.text('Report Details:', margin, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
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
    doc.setFillColor(230, 240, 235);
    doc.setTextColor(20, 60, 40);
    doc.setFontSize(8.5);
    
    const colWidth = (pageWidth - 2 * margin) / headers.length;
    const headerHeight = lineHeight + 2;
    
    headers.forEach((header, i) => {
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight);
      doc.text(header, margin + i * colWidth + 1.5, yPosition - 1, { maxWidth: colWidth - 3, align: 'left' });
    });
    doc.setTextColor(0);
    yPosition += 3;

    // Draw table data with alternating row colors
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    
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

  // Target Shooting Section - Detailed Vertical Format
  if (targetRecords.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('TARGET SHOOTING SESSIONS - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    targetRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Session header
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      // Session basic info
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'}`, margin + 2, yPosition);
      yPosition += 4;
      
      // Firearms used
      if (record.rifles_used && record.rifles_used.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Firearms & Ammunition:', margin + 2, yPosition);
        yPosition += 3;
        
        record.rifles_used.forEach((rifle, rIdx) => {
          const rifleData = rifles[rifle.rifle_id];
          doc.setFont(undefined, 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0);
          
          doc.text(`Rifle ${rIdx + 1}: ${rifleData ? rifleData.name : 'N/A'}`, margin + 4, yPosition);
          yPosition += 2.5;
          
          if (rifleData) {
            doc.text(`  Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'}`, margin + 6, yPosition);
            yPosition += 2.5;
            
            doc.text(`  Caliber: ${rifleData.caliber || '-'} | Serial: ${rifleData.serial_number || '-'}`, margin + 6, yPosition);
            yPosition += 2.5;
          }
          
          doc.text(`  Rounds Fired: ${rifle.rounds_fired || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Ammunition Brand: ${rifle.ammunition_brand || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Bullet Type: ${rifle.bullet_type || '-'} | Grain: ${rifle.grain || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Range Distance: ${rifle.meters_range ? rifle.meters_range + 'm' : '-'}`, margin + 6, yPosition);
          yPosition += 3;
        });
      }
      
      // Notes
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
  }

  // Clay Shooting Section - Detailed Vertical Format
  if (clayRecords.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('CLAY SHOOTING SESSIONS - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    clayRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'} | Rounds: ${record.rounds_fired || '-'}`, margin + 2, yPosition);
      yPosition += 4;
      
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
  }

  // Deer Management Section - Detailed Vertical Format
  if (deerRecords.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('DEER MANAGEMENT ACTIVITY LOG - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    deerRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Activity ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Location: ${record.place_name || '-'} | Species: ${record.deer_species || '-'} | Harvested: ${record.number_shot || '0'}`, margin + 2, yPosition);
      yPosition += 3;
      
      doc.text(`Time: ${record.start_time || '-'} - ${record.end_time || '-'} | Caliber: ${record.caliber || '-'}`, margin + 2, yPosition);
      yPosition += 3;
      
      if (record.ammunition_used) {
        doc.text(`Ammunition: ${record.ammunition_used}`, margin + 2, yPosition);
        yPosition += 3;
      }
      
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
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

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}) {
  const doc = generateBase44Pdf(records, userInfo, rifles);
  return doc.output('blob');
}

function generateBase44Pdf(records, userInfo = null, rifles = {}) {

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 10;
  const margin = 15;
  const lineHeight = 5;

  // Professional Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(20, 60, 40);
  doc.text('OFFICIAL SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text('Comprehensive Activity Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // User Information Header Box
  if (userInfo) {
    doc.setDrawColor(20, 60, 40);
    doc.setFillColor(240, 248, 245);
    doc.rect(margin, yPosition - 1, pageWidth - 2 * margin, 20, 'F');
    doc.rect(margin, yPosition - 1, pageWidth - 2 * margin, 20);
    
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('PARTICIPANT INFORMATION', margin + 3, yPosition + 2);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    yPosition += 6;
    
    doc.text(`Name: ${userInfo.full_name || 'N/A'}`, margin + 3, yPosition);
    yPosition += 4;
    
    if (userInfo.date_of_birth) {
      const dob = new Date(userInfo.date_of_birth);
      const dobStr = dob.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date of Birth: ${dobStr}`, margin + 3, yPosition);
    } else {
      doc.text(`Date of Birth: N/A`, margin + 3, yPosition);
    }
    yPosition += 4;
    
    doc.text(`Address: ${userInfo.address || 'N/A'}`, margin + 3, yPosition, { maxWidth: pageWidth - 2 * margin - 6 });
    yPosition += 8;
  }
  
  yPosition += 3;
  
  // Report metadata
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(20, 60, 40);
  doc.text('Report Details:', margin, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
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
    doc.setFillColor(230, 240, 235);
    doc.setTextColor(20, 60, 40);
    doc.setFontSize(8.5);
    
    const colWidth = (pageWidth - 2 * margin) / headers.length;
    const headerHeight = lineHeight + 2;
    
    headers.forEach((header, i) => {
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin + i * colWidth, yPosition - headerHeight + 2, colWidth, headerHeight);
      doc.text(header, margin + i * colWidth + 1.5, yPosition - 1, { maxWidth: colWidth - 3, align: 'left' });
    });
    doc.setTextColor(0);
    yPosition += 3;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    
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
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('TARGET SHOOTING SESSIONS - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    targetRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'}`, margin + 2, yPosition);
      yPosition += 4;
      
      if (record.rifles_used && record.rifles_used.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Firearms & Ammunition:', margin + 2, yPosition);
        yPosition += 3;
        
        record.rifles_used.forEach((rifle, rIdx) => {
          const rifleData = rifles[rifle.rifle_id];
          doc.setFont(undefined, 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0);
          
          doc.text(`Rifle ${rIdx + 1}: ${rifleData ? rifleData.name : 'N/A'}`, margin + 4, yPosition);
          yPosition += 2.5;
          
          if (rifleData) {
            doc.text(`  Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'}`, margin + 6, yPosition);
            yPosition += 2.5;
            
            doc.text(`  Caliber: ${rifleData.caliber || '-'} | Serial: ${rifleData.serial_number || '-'}`, margin + 6, yPosition);
            yPosition += 2.5;
          }
          
          doc.text(`  Rounds Fired: ${rifle.rounds_fired || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Ammunition Brand: ${rifle.ammunition_brand || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Bullet Type: ${rifle.bullet_type || '-'} | Grain: ${rifle.grain || '-'}`, margin + 6, yPosition);
          yPosition += 2.5;
          
          doc.text(`  Range Distance: ${rifle.meters_range ? rifle.meters_range + 'm' : '-'}`, margin + 6, yPosition);
          yPosition += 3;
        });
      }
      
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
  }

  if (clayRecords.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('CLAY SHOOTING SESSIONS - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    clayRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'} | Rounds: ${record.rounds_fired || '-'}`, margin + 2, yPosition);
      yPosition += 4;
      
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
  }

  if (deerRecords.length > 0) {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 100, 45);
    doc.text('DEER MANAGEMENT ACTIVITY LOG - DETAILED REPORT', margin, yPosition);
    yPosition += 4;
    
    doc.setDrawColor(30, 100, 45);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 6;
    
    deerRecords.forEach((record, idx) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(20, 60, 40);
      doc.text(`Activity ${idx + 1} - ${record.date}`, margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`Location: ${record.place_name || '-'} | Species: ${record.deer_species || '-'} | Harvested: ${record.number_shot || '0'}`, margin + 2, yPosition);
      yPosition += 3;
      
      doc.text(`Time: ${record.start_time || '-'} - ${record.end_time || '-'} | Caliber: ${record.caliber || '-'}`, margin + 2, yPosition);
      yPosition += 3;
      
      if (record.ammunition_used) {
        doc.text(`Ammunition: ${record.ammunition_used}`, margin + 2, yPosition);
        yPosition += 3;
      }
      
      if (record.notes) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 100, 45);
        doc.setFontSize(8);
        doc.text('Notes:', margin + 2, yPosition);
        yPosition += 2;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 4);
        wrappedNotes.forEach(line => {
          if (yPosition > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 4, yPosition);
          yPosition += 2;
        });
      }
      
      yPosition += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
    });
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