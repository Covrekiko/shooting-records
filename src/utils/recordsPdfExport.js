import jsPDF from 'jspdf';

function generateDocumentId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${timestamp}-${random}`;
}

function addPageId(doc, docId, pageNum, pageWidth) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont(undefined, 'normal');
  doc.text(`Doc ID: ${docId} | Page ${pageNum}`, pageWidth - 15, 8, { align: 'right' });
}

const STYLES = {
  margin: 15,
  headingColor: [40, 80, 120],
  textColor: [0, 0, 0],
  accentColor: [30, 100, 45],
  lightGray: [240, 242, 245],
  darkGray: [60, 60, 60],
};

export async function exportRecordsToPdf(records, userInfo = null, fileName = 'shooting-records.pdf', rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docId = generateDocumentId();
  let pageNum = 1;

  if (userInfo) {
    createFrontPage(doc, userInfo, pageWidth, pageHeight, docId);
    addPageId(doc, docId, pageNum, pageWidth);
    pageNum++;
    doc.addPage();
    addPageId(doc, docId, pageNum, pageWidth);
  }

  let yPosition = STYLES.margin;

  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs, docId, pageNum);
    pageNum = doc.getNumberOfPages();
  }

  if (clayRecords.length > 0) {
    doc.addPage();
    pageNum++;
    addPageId(doc, docId, pageNum, pageWidth);
    yPosition = STYLES.margin;
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs, docId, pageNum);
    pageNum = doc.getNumberOfPages();
  }

  if (deerRecords.length > 0) {
    doc.addPage();
    pageNum++;
    addPageId(doc, docId, pageNum, pageWidth);
    yPosition = STYLES.margin;
    yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles, docId, pageNum);
  }

  doc.save(fileName);
}

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docId = generateDocumentId();
  let pageNum = 1;

  if (userInfo) {
    createFrontPage(doc, userInfo, pageWidth, pageHeight, docId);
    addPageId(doc, docId, pageNum, pageWidth);
    pageNum++;
    doc.addPage();
    addPageId(doc, docId, pageNum, pageWidth);
  }

  let yPosition = STYLES.margin;

  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs, docId, pageNum);
    pageNum = doc.getNumberOfPages();
  }

  if (clayRecords.length > 0) {
    doc.addPage();
    pageNum++;
    addPageId(doc, docId, pageNum, pageWidth);
    yPosition = STYLES.margin;
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs, docId, pageNum);
    pageNum = doc.getNumberOfPages();
  }

  if (deerRecords.length > 0) {
    doc.addPage();
    pageNum++;
    addPageId(doc, docId, pageNum, pageWidth);
    yPosition = STYLES.margin;
    yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles, docId, pageNum);
  }

  return doc.output('blob');
}

function createFrontPage(doc, userInfo, pageWidth, pageHeight, docId) {
  const { margin } = STYLES;
  let yPosition = pageHeight * 0.25;

  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.headingColor);
  doc.text('SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Official Regulatory Compliance Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  doc.setFillColor(...STYLES.lightGray);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 55, 'F');

  doc.setTextColor(...STYLES.darkGray);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text(userInfo.full_name || 'Participant', pageWidth / 2, yPosition + 12, { align: 'center' });

  yPosition += 25;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...STYLES.textColor);

  if (userInfo.date_of_birth) {
    const dob = new Date(userInfo.date_of_birth);
    const dobStr = dob.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Date of Birth: ${dobStr}`, margin + 10, yPosition);
    yPosition += 8;
  }

  if (userInfo.address) {
    doc.text('Address:', margin + 10, yPosition);
    const addressText = doc.splitTextToSize(userInfo.address, pageWidth - 2 * margin - 20);
    yPosition += 6;
    addressText.forEach((line) => {
      doc.text(line, margin + 10, yPosition);
      yPosition += 5;
    });
  }

  yPosition = pageHeight - 25;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Report Generated: ${dateStr} at ${timeStr}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition = pageHeight - 40;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Doc ID: ${docId}`, margin + 5, yPosition);
}

function renderTargetShootingSection(doc, records, startY, pageWidth, pageHeight, rifles, clubs, docId, pageNum) {
  const { margin } = STYLES;
  let yPosition = startY;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.accentColor);
  doc.text('TARGET SHOOTING SESSIONS', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(...STYLES.accentColor);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin + 5;
    }

    // Session header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(`Session ${idx + 1}: ${record.date}`, margin, yPosition);
    yPosition += 6;

    // Venue
    if (record.club_id && clubs[record.club_id]) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Venue', margin + 2, yPosition);
      yPosition += 4;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${clubs[record.club_id].name}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 5, yPosition);
      yPosition += 5;
    }

    // Time
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...STYLES.textColor);
    doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'}`, margin + 2, yPosition);
    yPosition += 5;

    // Firearms
    if (record.rifles_used && record.rifles_used.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Firearms & Ammunition', margin + 2, yPosition);
      yPosition += 4;

      record.rifles_used.forEach((rifle, rIdx) => {
        const rifleData = rifles[rifle.rifle_id];
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...STYLES.textColor);

        if (rifleData) {
          doc.text(`${rifleData.name}`, margin + 5, yPosition);
          yPosition += 3.5;
          doc.setTextColor(80, 80, 80);
          doc.text(`Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'} | Caliber: ${rifleData.caliber || '-'}`, margin + 5, yPosition);
          yPosition += 3.5;
          doc.text(`Serial: ${rifleData.serial_number || '-'}`, margin + 5, yPosition);
          yPosition += 3.5;
        }

        doc.setTextColor(...STYLES.textColor);
        doc.text(`Rounds Fired: ${rifle.rounds_fired || '0'} | Range: ${rifle.meters_range || '-'}m`, margin + 5, yPosition);
        yPosition += 3.5;
        doc.text(`Ammunition: ${rifle.ammunition_brand || '-'} | Type: ${rifle.bullet_type || '-'} | Grain: ${rifle.grain || '-'}`, margin + 5, yPosition);
        yPosition += 5;
      });
    }

    // Notes
    if (record.notes) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Notes', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 5);
      wrappedNotes.forEach(line => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 3.5;
      });
      yPosition += 2;
    }

    // GPS
    if (record.gps_track && record.gps_track.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('GPS Track', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`Points: ${record.gps_track.length}`, margin + 5, yPosition);
      yPosition += 3;
      if (record.gps_track[0]) {
        doc.text(`Start: ${record.gps_track[0].lat.toFixed(6)}, ${record.gps_track[0].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 3;
      }
      if (record.gps_track[record.gps_track.length - 1]) {
        doc.text(`End: ${record.gps_track[record.gps_track.length - 1].lat.toFixed(6)}, ${record.gps_track[record.gps_track.length - 1].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 5;
      }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}

function renderClayShootingSection(doc, records, startY, pageWidth, pageHeight, shotguns, clubs, docId, pageNum) {
  const { margin } = STYLES;
  let yPosition = startY;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.accentColor);
  doc.text('CLAY SHOOTING SESSIONS', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(...STYLES.accentColor);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin + 5;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(`Session ${idx + 1}: ${record.date}`, margin, yPosition);
    yPosition += 6;

    if (record.club_id && clubs[record.club_id]) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Venue', margin + 2, yPosition);
      yPosition += 4;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${clubs[record.club_id].name}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 5, yPosition);
      yPosition += 5;
    }

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...STYLES.textColor);
    doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'} | Rounds: ${record.rounds_fired || '-'}`, margin + 2, yPosition);
    yPosition += 5;

    if (record.shotgun_id && shotguns[record.shotgun_id]) {
      const shotgunData = shotguns[record.shotgun_id];
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Shotgun Details', margin + 2, yPosition);
      yPosition += 4;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${shotgunData.name}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.setTextColor(80, 80, 80);
      doc.text(`Make: ${shotgunData.make || '-'} | Model: ${shotgunData.model || '-'} | Gauge: ${shotgunData.gauge || '-'}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.text(`Serial: ${shotgunData.serial_number || '-'}`, margin + 5, yPosition);
      yPosition += 5;
    }

    if (record.ammunition_used) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Ammunition', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(record.ammunition_used, margin + 5, yPosition);
      yPosition += 5;
    }

    if (record.notes) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Notes', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 5);
      wrappedNotes.forEach(line => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 3.5;
      });
      yPosition += 2;
    }

    if (record.gps_track && record.gps_track.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('GPS Track', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`Points: ${record.gps_track.length}`, margin + 5, yPosition);
      yPosition += 3;
      if (record.gps_track[0]) {
        doc.text(`Start: ${record.gps_track[0].lat.toFixed(6)}, ${record.gps_track[0].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 3;
      }
      if (record.gps_track[record.gps_track.length - 1]) {
        doc.text(`End: ${record.gps_track[record.gps_track.length - 1].lat.toFixed(6)}, ${record.gps_track[record.gps_track.length - 1].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 5;
      }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}

function renderDeerManagementSection(doc, records, startY, pageWidth, pageHeight, rifles, docId, pageNum) {
  const { margin } = STYLES;
  let yPosition = startY;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.accentColor);
  doc.text('DEER MANAGEMENT ACTIVITIES', margin, yPosition);
  yPosition += 2;
  doc.setDrawColor(...STYLES.accentColor);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin + 5;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(`Activity ${idx + 1}: ${record.date}`, margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkGray);
    doc.text('Location', margin + 2, yPosition);
    yPosition += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...STYLES.textColor);
    doc.text(`${record.place_name || 'Unknown'}`, margin + 5, yPosition);
    yPosition += 5;

    doc.setFontSize(8.5);
    doc.text(`Time: ${record.start_time || '-'} to ${record.end_time || '-'}`, margin + 2, yPosition);
    yPosition += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkGray);
    doc.text('Activity Details', margin + 2, yPosition);
    yPosition += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...STYLES.textColor);
    doc.text(`Species: ${record.deer_species || '-'} | Total Harvested: ${record.total_count || '0'}`, margin + 5, yPosition);
    yPosition += 5;

    if (record.species_list && record.species_list.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Harvest Breakdown', margin + 2, yPosition);
      yPosition += 4;
      record.species_list.forEach(s => {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...STYLES.textColor);
        doc.text(`${s.species}: ${s.count}`, margin + 5, yPosition);
        yPosition += 3;
      });
      yPosition += 2;
    }

    if (record.rifle_id && rifles[record.rifle_id]) {
      const rifleData = rifles[record.rifle_id];
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Rifle Details', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${rifleData.name}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.setTextColor(80, 80, 80);
      doc.text(`Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'} | Caliber: ${rifleData.caliber || '-'}`, margin + 5, yPosition);
      yPosition += 3.5;
      doc.text(`Serial: ${rifleData.serial_number || '-'}`, margin + 5, yPosition);
      yPosition += 5;
    }

    if (record.ammunition_used) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Ammunition', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(record.ammunition_used, margin + 5, yPosition);
      yPosition += 5;
    }

    if (record.notes) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Notes', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 5);
      wrappedNotes.forEach(line => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 3.5;
      });
      yPosition += 2;
    }

    if (record.gps_track && record.gps_track.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('GPS Track', margin + 2, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`Points: ${record.gps_track.length}`, margin + 5, yPosition);
      yPosition += 3;
      if (record.gps_track[0]) {
        doc.text(`Start: ${record.gps_track[0].lat.toFixed(6)}, ${record.gps_track[0].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 3;
      }
      if (record.gps_track[record.gps_track.length - 1]) {
        doc.text(`End: ${record.gps_track[record.gps_track.length - 1].lat.toFixed(6)}, ${record.gps_track[record.gps_track.length - 1].lng.toFixed(6)}`, margin + 5, yPosition);
        yPosition += 5;
      }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}