import jsPDF from 'jspdf';

const STYLES = {
  margin: 20,
  headingColor: [30, 100, 45],
  textColor: [0, 0, 0],
  darkColor: [20, 60, 40],
  lightBg: [240, 248, 245],
};

export async function exportRecordsToPdf(records, userInfo = null, fileName = 'shooting-records.pdf', rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Front page with user info
  if (userInfo) {
    createFrontPage(doc, userInfo, pageWidth, pageHeight);
    doc.addPage();
  }

  let yPosition = STYLES.margin;

  // Group records by type
  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  // Render each section
  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs);
    if (clayRecords.length > 0 || deerRecords.length > 0) {
      doc.addPage();
      yPosition = STYLES.margin;
    }
  }

  if (clayRecords.length > 0) {
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs);
    if (deerRecords.length > 0) {
      doc.addPage();
      yPosition = STYLES.margin;
    }
  }

  if (deerRecords.length > 0) {
    yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles);
  }

  doc.save(fileName);
}

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}, clubs = {}, shotguns = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (userInfo) {
    createFrontPage(doc, userInfo, pageWidth, pageHeight);
    doc.addPage();
  }

  let yPosition = STYLES.margin;

  const targetRecords = records.filter(r => r.recordType === 'target');
  const clayRecords = records.filter(r => r.recordType === 'clay');
  const deerRecords = records.filter(r => r.recordType === 'deer');

  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs);
    if (clayRecords.length > 0 || deerRecords.length > 0) {
      doc.addPage();
      yPosition = STYLES.margin;
    }
  }

  if (clayRecords.length > 0) {
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs);
    if (deerRecords.length > 0) {
      doc.addPage();
      yPosition = STYLES.margin;
    }
  }

  if (deerRecords.length > 0) {
    yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles);
  }

  return doc.output('blob');
}

function createFrontPage(doc, userInfo, pageWidth, pageHeight) {
  const { margin } = STYLES;
  let yPosition = pageHeight * 0.2;

  // Title
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.darkColor);
  doc.text('SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text('Official Log for Regulatory Compliance', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // User info box
  doc.setDrawColor(...STYLES.darkColor);
  doc.setFillColor(...STYLES.lightBg);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 50, 'FD');

  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.text(userInfo.full_name || 'Participant', margin + 10, yPosition + 12);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  yPosition += 22;

  if (userInfo.date_of_birth) {
    const dob = new Date(userInfo.date_of_birth);
    const dobStr = dob.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Date of Birth: ${dobStr}`, margin + 10, yPosition);
  }

  yPosition += 8;
  if (userInfo.address) {
    const addressText = doc.splitTextToSize(userInfo.address, pageWidth - 2 * margin - 20);
    doc.text(`Address:`, margin + 10, yPosition);
    addressText.forEach((line, idx) => {
      doc.text(line, margin + 10, yPosition + 6 + idx * 5);
    });
  }

  yPosition = pageHeight - 30;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Report Generated: ${dateStr} at ${timeStr}`, pageWidth / 2, yPosition, { align: 'center' });
}

function renderTargetShootingSection(doc, records, startY, pageWidth, pageHeight, rifles, clubs) {
  const { margin } = STYLES;
  let yPosition = startY;

  addSectionTitle(doc, 'TARGET SHOOTING SESSIONS', yPosition, pageWidth);
  yPosition += 12;

  records.forEach((record) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Session header
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`${record.date}`, margin, yPosition);
    yPosition += 7;

    // Venue
    if (record.club_id && clubs[record.club_id]) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`${clubs[record.club_id].name}`, margin + 5, yPosition);
      yPosition += 5;
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 5, yPosition);
      yPosition += 5;
    }

    // Times
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(`${record.checkin_time} - ${record.checkout_time}`, margin + 5, yPosition);
    yPosition += 6;

    // Firearms
    if (record.rifles_used && record.rifles_used.length > 0) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Firearms:', margin + 5, yPosition);
      yPosition += 5;

      record.rifles_used.forEach((rifle) => {
        const rifleData = rifles[rifle.rifle_id];
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0);
        
        if (rifleData) {
          doc.text(`${rifleData.name} | ${rifle.rounds_fired} rounds @ ${rifle.meters_range}m`, margin + 8, yPosition);
          yPosition += 4;
          doc.setTextColor(80);
          doc.text(`${rifleData.caliber} | ${rifle.ammunition_brand}`, margin + 8, yPosition);
          yPosition += 4;
        }
      });
      yPosition += 2;
    }

    // Notes
    if (record.notes) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Notes:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 10);
      wrappedNotes.slice(0, 2).forEach(line => {
        doc.setFontSize(7);
        doc.text(line, margin + 8, yPosition);
        yPosition += 3;
      });
      yPosition += 3;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}

function renderClayShootingSection(doc, records, startY, pageWidth, pageHeight, shotguns, clubs) {
  const { margin } = STYLES;
  let yPosition = startY;

  addSectionTitle(doc, 'CLAY SHOOTING SESSIONS', yPosition, pageWidth);
  yPosition += 12;

  records.forEach((record) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`${record.date}`, margin, yPosition);
    yPosition += 7;

    if (record.club_id && clubs[record.club_id]) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      doc.text(`${clubs[record.club_id].name}`, margin + 5, yPosition);
      yPosition += 5;
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 5, yPosition);
      yPosition += 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(`${record.checkin_time} - ${record.checkout_time} | ${record.rounds_fired} rounds`, margin + 5, yPosition);
    yPosition += 6;

    if (record.shotgun_id && shotguns[record.shotgun_id]) {
      const shotgunData = shotguns[record.shotgun_id];
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Shotgun:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`${shotgunData.name} | ${shotgunData.gauge}`, margin + 8, yPosition);
      yPosition += 4;
      doc.setTextColor(80);
      doc.text(`${shotgunData.make} ${shotgunData.model}`, margin + 8, yPosition);
      yPosition += 4;
    }

    if (record.ammunition_used) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Ammunition:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(record.ammunition_used, margin + 8, yPosition);
      yPosition += 4;
    }

    if (record.notes) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Notes:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 10);
      wrappedNotes.slice(0, 2).forEach(line => {
        doc.setFontSize(7);
        doc.text(line, margin + 8, yPosition);
        yPosition += 3;
      });
      yPosition += 3;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}

function renderDeerManagementSection(doc, records, startY, pageWidth, pageHeight, rifles) {
  const { margin } = STYLES;
  let yPosition = startY;

  addSectionTitle(doc, 'DEER MANAGEMENT ACTIVITIES', yPosition, pageWidth);
  yPosition += 12;

  records.forEach((record) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkColor);
    doc.text(`${record.date}`, margin, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text(`${record.place_name || 'Unknown Location'}`, margin + 5, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(`${record.start_time} - ${record.end_time}`, margin + 5, yPosition);
    yPosition += 5;

    doc.setTextColor(0);
    doc.text(`Species: ${record.deer_species} | Harvested: ${record.total_count || '0'}`, margin + 5, yPosition);
    yPosition += 6;

    if (record.species_list && record.species_list.length > 0) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Harvest:', margin + 5, yPosition);
      yPosition += 4;
      
      record.species_list.forEach(s => {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0);
        doc.text(`${s.species}: ${s.count}`, margin + 8, yPosition);
        yPosition += 3;
      });
      yPosition += 2;
    }

    if (record.rifle_id && rifles[record.rifle_id]) {
      const rifleData = rifles[record.rifle_id];
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Rifle:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`${rifleData.name} | ${rifleData.caliber}`, margin + 8, yPosition);
      yPosition += 4;
    }

    if (record.ammunition_used) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Ammunition:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(record.ammunition_used, margin + 8, yPosition);
      yPosition += 4;
    }

    if (record.notes) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.headingColor);
      doc.text('Notes:', margin + 5, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 10);
      wrappedNotes.slice(0, 2).forEach(line => {
        doc.setFontSize(7);
        doc.text(line, margin + 8, yPosition);
        yPosition += 3;
      });
      yPosition += 3;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}

function addSectionTitle(doc, title, yPosition, pageWidth) {
  const { margin } = STYLES;
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...STYLES.headingColor);
  doc.text(title, margin, yPosition);
  doc.setDrawColor(...STYLES.headingColor);
  doc.line(margin, yPosition + 1.5, pageWidth - margin, yPosition + 1.5);
}