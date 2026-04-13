import jsPDF from 'jspdf';

const STYLES = {
  margin: 15,
  lineHeight: 5,
  headingColor: [30, 100, 45],
  textColor: [0, 0, 0],
  secondaryColor: [100, 100, 100],
  darkColor: [20, 60, 40],
};

export async function generateRecordsPdf(records) {
  const doc = new jsPDF();
  return doc;
}

export async function exportRecordsToPdf(records, userInfo = null, fileName = 'shooting-records.pdf', rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 10;

  // Add header
  addPdfHeader(doc, pageWidth, yPosition, userInfo);
  yPosition += 40;

  // Group records by type
  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  // Render each section
  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs);
  }

  if (clayRecords.length > 0) {
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs);
  }

  if (deerRecords.length > 0) {
    yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles);
  }

  doc.save(fileName);
}

function addPdfHeader(doc, pageWidth, yPosition, userInfo) {
  const { margin } = STYLES;
  
  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.darkColor);
  doc.text('OFFICIAL SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  
  // Subtitle
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text('Comprehensive Activity Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // User info box
  if (userInfo) {
    doc.setDrawColor(...STYLES.darkColor);
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
  doc.setTextColor(...STYLES.darkColor);
  doc.text('Report Details:', margin, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr} at ${timeStr}`, margin + 2, yPosition);
}

function renderTargetShootingSection(doc, records, startY, pageWidth, pageHeight, rifles, clubs) {
  const { margin } = STYLES;
  let yPosition = startY;

  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = margin;
  }

  addSectionTitle(doc, 'TARGET SHOOTING SESSIONS - DETAILED REPORT', yPosition, pageWidth);
  yPosition += 10;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    // Session header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
    yPosition += 4;

    // Venue
    if (record.club_id && clubs[record.club_id]) {
      yPosition = addDetailSection(doc, 'Venue:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`${clubs[record.club_id].name}`, margin + 4, yPosition);
      yPosition += 2.5;
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 4, yPosition);
      yPosition += 3;
    }

    // Times
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'}`, margin + 2, yPosition);
    yPosition += 4;

    // Firearms
    if (record.rifles_used && record.rifles_used.length > 0) {
      yPosition = addDetailSection(doc, 'Firearms & Ammunition:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderRifleDetails(doc, record.rifles_used, rifles, margin, yPosition, pageWidth, pageHeight);
    }

    // Notes
    if (record.notes) {
      yPosition = addDetailSection(doc, 'Notes:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderNotes(doc, record.notes, margin, yPosition, pageWidth, pageHeight);
    }

    // GPS
    if (record.gps_track && record.gps_track.length > 0) {
      yPosition = addDetailSection(doc, 'GPS Geolocation:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderGpsData(doc, record.gps_track, margin, yPosition, pageWidth, pageHeight);
    }

    yPosition += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  });

  return yPosition;
}

function renderClayShootingSection(doc, records, startY, pageWidth, pageHeight, shotguns, clubs) {
  const { margin } = STYLES;
  let yPosition = startY;

  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = margin;
  }

  addSectionTitle(doc, 'CLAY SHOOTING SESSIONS - DETAILED REPORT', yPosition, pageWidth);
  yPosition += 10;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`Session ${idx + 1} - ${record.date}`, margin, yPosition);
    yPosition += 4;

    // Venue
    if (record.club_id && clubs[record.club_id]) {
      yPosition = addDetailSection(doc, 'Venue:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`${clubs[record.club_id].name}`, margin + 4, yPosition);
      yPosition += 2.5;
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 4, yPosition);
      yPosition += 3;
    }

    // Times and rounds
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'} | Rounds: ${record.rounds_fired || '-'}`, margin + 2, yPosition);
    yPosition += 4;

    // Shotgun
    if (record.shotgun_id && shotguns[record.shotgun_id]) {
      const shotgunData = shotguns[record.shotgun_id];
      yPosition = addDetailSection(doc, 'Shotgun & Ammunition:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`${shotgunData.name}`, margin + 4, yPosition);
      yPosition += 2.5;
      doc.text(`  Make: ${shotgunData.make || '-'} | Model: ${shotgunData.model || '-'}`, margin + 6, yPosition);
      yPosition += 2.5;
      doc.text(`  Gauge: ${shotgunData.gauge || '-'} | Serial: ${shotgunData.serial_number || '-'}`, margin + 6, yPosition);
      yPosition += 3;
    }

    // Ammunition
    if (record.ammunition_used) {
      yPosition = addDetailSection(doc, 'Ammunition:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.setFontSize(7.5);
      doc.text(record.ammunition_used, margin + 4, yPosition);
      yPosition += 3;
    }

    // Notes
    if (record.notes) {
      yPosition = addDetailSection(doc, 'Notes:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderNotes(doc, record.notes, margin, yPosition, pageWidth, pageHeight);
    }

    // GPS
    if (record.gps_track && record.gps_track.length > 0) {
      yPosition = addDetailSection(doc, 'GPS Geolocation:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderGpsData(doc, record.gps_track, margin, yPosition, pageWidth, pageHeight);
    }

    yPosition += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  });

  return yPosition;
}

function renderDeerManagementSection(doc, records, startY, pageWidth, pageHeight, rifles) {
  const { margin } = STYLES;
  let yPosition = startY;

  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = margin;
  }

  addSectionTitle(doc, 'DEER MANAGEMENT ACTIVITY LOG - DETAILED REPORT', yPosition, pageWidth);
  yPosition += 10;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`Activity ${idx + 1} - ${record.date}`, margin, yPosition);
    yPosition += 4;

    // Location & Details
    yPosition = addDetailSection(doc, 'Location & Details:', margin, yPosition, pageWidth, pageHeight);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.setFontSize(7.5);
    doc.text(`Location: ${record.place_name || '-'}`, margin + 4, yPosition);
    yPosition += 2.5;
    doc.text(`Time: ${record.start_time || '-'} - ${record.end_time || '-'}`, margin + 4, yPosition);
    yPosition += 2.5;
    doc.text(`Species: ${record.deer_species || '-'} | Harvested: ${record.number_shot || '0'}`, margin + 4, yPosition);
    yPosition += 3;

    // Species list
    if (record.species_list && record.species_list.length > 0) {
      yPosition = addDetailSection(doc, 'Species Harvested:', margin, yPosition, pageWidth, pageHeight);
      record.species_list.forEach(s => {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0);
        doc.text(`  ${s.species}: ${s.count}`, margin + 4, yPosition);
        yPosition += 2;
      });
      yPosition += 1;
    }

    // Rifle & Ammunition
    if (record.rifle_id && rifles[record.rifle_id]) {
      const rifleData = rifles[record.rifle_id];
      yPosition = addDetailSection(doc, 'Rifle & Ammunition:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`${rifleData.name}`, margin + 4, yPosition);
      yPosition += 2.5;
      doc.text(`  Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'}`, margin + 6, yPosition);
      yPosition += 2.5;
      doc.text(`  Caliber: ${rifleData.caliber || '-'} | Serial: ${rifleData.serial_number || '-'}`, margin + 6, yPosition);
      yPosition += 2.5;
    }

    // Ammunition
    if (record.ammunition_used) {
      yPosition = addDetailSection(doc, 'Ammunition:', margin, yPosition, pageWidth, pageHeight);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(record.ammunition_used, margin + 4, yPosition);
      yPosition += 3;
    }

    // Notes
    if (record.notes) {
      yPosition = addDetailSection(doc, 'Notes:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderNotes(doc, record.notes, margin, yPosition, pageWidth, pageHeight);
    }

    // GPS
    if (record.gps_track && record.gps_track.length > 0) {
      yPosition = addDetailSection(doc, 'GPS Geolocation:', margin, yPosition, pageWidth, pageHeight);
      yPosition = renderGpsData(doc, record.gps_track, margin, yPosition, pageWidth, pageHeight);
    }

    yPosition += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  });

  return yPosition;
}

// Helper functions
function addSectionTitle(doc, title, yPosition, pageWidth) {
  const { margin } = STYLES;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.headingColor);
  doc.text(title, margin, yPosition);
  doc.setDrawColor(...STYLES.headingColor);
  doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
}

function addDetailSection(doc, label, margin, yPosition, pageWidth, pageHeight) {
  if (yPosition > pageHeight - 10) {
    doc.addPage();
    yPosition = margin;
  }
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.headingColor);
  doc.setFontSize(8);
  doc.text(label, margin + 2, yPosition);
  return yPosition + 2;
}

function renderRifleDetails(doc, rifles, riflesMap, margin, yPosition, pageWidth, pageHeight) {
  rifles.forEach((rifle, rIdx) => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
    const rifleData = riflesMap[rifle.rifle_id];
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
  return yPosition;
}

function renderNotes(doc, notes, margin, yPosition, pageWidth, pageHeight) {
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
  doc.setFontSize(7);
  const wrappedNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin - 4);
  wrappedNotes.forEach(line => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin + 4, yPosition);
    yPosition += 2;
  });
  return yPosition;
}

function renderGpsData(doc, gpsTrack, margin, yPosition, pageWidth, pageHeight) {
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
  doc.setFontSize(7.5);
  doc.text(`Track Points: ${gpsTrack.length}`, margin + 4, yPosition);
  yPosition += 2;
  
  if (gpsTrack[0]) {
    doc.text(`Start: ${gpsTrack[0].lat.toFixed(6)}, ${gpsTrack[0].lng.toFixed(6)}`, margin + 4, yPosition);
    yPosition += 2;
  }
  
  if (gpsTrack[gpsTrack.length - 1]) {
    doc.text(`End: ${gpsTrack[gpsTrack.length - 1].lat.toFixed(6)}, ${gpsTrack[gpsTrack.length - 1].lng.toFixed(6)}`, margin + 4, yPosition);
    yPosition += 3;
  }
  
  return yPosition;
}

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}, clubs = {}) {
  const doc = generateBase44Pdf(records, userInfo, rifles, clubs);
  return doc.output('blob');
}

function generateBase44Pdf(records, userInfo = null, rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  return doc;
}