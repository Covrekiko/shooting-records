import { jsPDF } from 'jspdf';
import { resolveClayClubName, getClayScoreSummary, calculateDuration, normalizePhotos } from '@/lib/claySessionUtils';

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

export async function exportRecordsToPdf(records, userInfo = null, fileName = 'shooting-records.pdf', rifles = {}, clubs = {}, shotguns = {}, locations = {}, targetGroups = [], clayData = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const docId = generateDocumentId();
    let pageNum = 1;

    // Always fetch fresh user data from the current session
    let userData = userInfo;
    if (!userData) {
      try {
        const { base44 } = await import('@/api/base44Client');
        const authUser = await base44.auth.me();
        // Fetch full user entity data with all profile fields (firstName, lastName, dateOfBirth, address fields, etc.)
        const fullUserData = await base44.entities.User.get(authUser.id);
        userData = {
          email: authUser.email,
          firstName: fullUserData.firstName || '',
          middleName: fullUserData.middleName || '',
          lastName: fullUserData.lastName || '',
          dateOfBirth: fullUserData.dateOfBirth || '',
          addressLine1: fullUserData.addressLine1 || '',
          addressLine2: fullUserData.addressLine2 || '',
          city: fullUserData.city || '',
          postcode: fullUserData.postcode || '',
          country: fullUserData.country || '',
        };
      } catch (e) {
        console.warn('Could not fetch fresh user data:', e);
      }
    }

   if (userData) {
     createFrontPage(doc, userData, pageWidth, pageHeight, docId);
     addPageId(doc, docId, pageNum, pageWidth);
     pageNum++;
     doc.addPage();
     addPageId(doc, docId, pageNum, pageWidth);
   }

  let yPosition = STYLES.margin;

  const targetRecords = records.filter(r => r.recordType === 'target' || r.category === 'target_shooting');
  const clayRecords = records.filter(r => r.recordType === 'clay' || r.category === 'clay_shooting');
  const deerRecords = records.filter(r => r.recordType === 'deer' || r.category === 'deer_management');

  if (targetRecords.length > 0) {
    yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs, docId, pageNum);
    pageNum = doc.getNumberOfPages();
  }

  if (clayRecords.length > 0) {
    doc.addPage();
    pageNum++;
    addPageId(doc, docId, pageNum, pageWidth);
    yPosition = STYLES.margin;
    yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs, docId, pageNum, clayData, locations);
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

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}, clubs = {}, shotguns = {}, locations = {}, targetGroups = [], clayData = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const docId = generateDocumentId();
    let pageNum = 1;

    // Always fetch fresh user data from the current session
    let userData = userInfo;
    if (!userData) {
      try {
        const { base44 } = await import('@/api/base44Client');
        const authUser = await base44.auth.me();
        // Fetch full user entity data with all profile fields (firstName, lastName, dateOfBirth, address fields, etc.)
        const fullUserData = await base44.entities.User.get(authUser.id);
        userData = {
          email: authUser.email,
          firstName: fullUserData.firstName || '',
          middleName: fullUserData.middleName || '',
          lastName: fullUserData.lastName || '',
          dateOfBirth: fullUserData.dateOfBirth || '',
          addressLine1: fullUserData.addressLine1 || '',
          addressLine2: fullUserData.addressLine2 || '',
          city: fullUserData.city || '',
          postcode: fullUserData.postcode || '',
          country: fullUserData.country || '',
        };
      } catch (e) {
        console.warn('Could not fetch fresh user data:', e);
      }
    }

    if (userData) {
      createFrontPage(doc, userData, pageWidth, pageHeight, docId);
      addPageId(doc, docId, pageNum, pageWidth);
      pageNum++;
      doc.addPage();
      addPageId(doc, docId, pageNum, pageWidth);
    }

    let yPosition = STYLES.margin;

    const targetRecords = records.filter(r => r.category === 'target_shooting');
    const clayRecords = records.filter(r => r.category === 'clay_shooting');
    const deerRecords = records.filter(r => r.category === 'deer_management');

    if (targetRecords.length > 0) {
      yPosition = renderTargetShootingSection(doc, targetRecords, yPosition, pageWidth, pageHeight, rifles, clubs, docId, pageNum, targetGroups);
      pageNum = doc.getNumberOfPages();
    }

    if (clayRecords.length > 0) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = STYLES.margin;
      yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs, docId, pageNum, clayData, locations);
      pageNum = doc.getNumberOfPages();
    }

    if (deerRecords.length > 0) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = STYLES.margin;
      yPosition = renderDeerManagementSection(doc, deerRecords, yPosition, pageWidth, pageHeight, rifles, locations, docId, pageNum);
    }

    return doc.output('blob');
  }

function createFrontPage(doc, userInfo, pageWidth, pageHeight, docId) {
   const { margin } = STYLES;
   let yPosition = pageHeight * 0.15;

   doc.setFontSize(28);
   doc.setFont(undefined, 'bold');
   doc.setTextColor(...STYLES.headingColor);
   doc.text('SHOOTING ACTIVITY RECORD', pageWidth / 2, yPosition, { align: 'center' });
   yPosition += 12;

   doc.setFontSize(11);
   doc.setFont(undefined, 'normal');
   doc.setTextColor(100, 100, 100);
   doc.text('Official Regulatory Compliance Report', pageWidth / 2, yPosition, { align: 'center' });
   yPosition += 20;

   // Personal Information Section
   doc.setFillColor(...STYLES.lightGray);
   doc.rect(margin, yPosition, pageWidth - 2 * margin, 3, 'F');
   yPosition += 5;

   doc.setFontSize(11);
   doc.setFont(undefined, 'bold');
   doc.setTextColor(...STYLES.headingColor);
   doc.text('PARTICIPANT INFORMATION', margin + 5, yPosition);
   yPosition += 10;

   doc.setFontSize(10);
   doc.setFont(undefined, 'normal');
   doc.setTextColor(...STYLES.textColor);

   // Build full name from firstName, middleName, lastName
   const fullName = [userInfo.firstName, userInfo.middleName, userInfo.lastName].filter(Boolean).join(' ');
   doc.setFont(undefined, 'bold');
   doc.text('Name:', margin + 5, yPosition);
   doc.setFont(undefined, 'normal');
   doc.text(fullName || '-', margin + 40, yPosition);
   yPosition += 8;

   // Email
   doc.setFont(undefined, 'bold');
   doc.text('Email:', margin + 5, yPosition);
   doc.setFont(undefined, 'normal');
   doc.text(userInfo.email || '-', margin + 40, yPosition);
   yPosition += 8;

   // Date of Birth
   doc.setFont(undefined, 'bold');
   doc.text('Date of Birth:', margin + 5, yPosition);
   doc.setFont(undefined, 'normal');
   if (userInfo.dateOfBirth) {
     const dob = new Date(userInfo.dateOfBirth);
     const dobStr = dob.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
     doc.text(dobStr, margin + 40, yPosition);
   } else {
     doc.text('-', margin + 40, yPosition);
   }
   yPosition += 8;

   // Address - build from address components
   doc.setFont(undefined, 'bold');
   doc.text('Address:', margin + 5, yPosition);
   doc.setFont(undefined, 'normal');
   const addressParts = [];
   if (userInfo.addressLine1) addressParts.push(userInfo.addressLine1);
   if (userInfo.addressLine2) addressParts.push(userInfo.addressLine2);
   if (userInfo.city) addressParts.push(userInfo.city);
   if (userInfo.postcode) addressParts.push(userInfo.postcode);
   if (userInfo.country) addressParts.push(userInfo.country);
   const fullAddress = addressParts.join(', ');
   if (fullAddress) {
     const addressText = doc.splitTextToSize(fullAddress, pageWidth - 2 * margin - 50);
     addressText.forEach((line, idx) => {
       doc.text(line, margin + 40, yPosition);
       yPosition += 5;
     });
   } else {
     doc.text('-', margin + 40, yPosition);
     yPosition += 5;
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

function renderTargetShootingSection(doc, records, startY, pageWidth, pageHeight, rifles, clubs, docId, pageNum, targetGroups = []) {
   const { margin } = STYLES;
   let yPosition = startY;

   records.forEach((record, idx) => {
     // New page for each session
     if (idx > 0) {
       doc.addPage();
       pageNum++;
       addPageId(doc, docId, pageNum, pageWidth);
       yPosition = margin;
     }

     // ═══ SESSION TITLE ═══
     doc.setFontSize(18);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.headingColor);
     doc.text('TARGET SHOOTING SESSION REPORT', margin, yPosition);
     yPosition += 7;

     doc.setFontSize(10);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(120, 120, 120);
     doc.text('Detailed Activity Record', margin, yPosition);
     yPosition += 12;

     // ═══ SECTION 1: SESSION OVERVIEW ═══
     doc.setFillColor(...STYLES.lightGray);
     doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
     doc.setFontSize(11);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.headingColor);
     doc.text('SESSION OVERVIEW', margin + 3, yPosition + 3.5);
     yPosition += 9;

     // Two-column layout with good spacing
     const colWidth = (pageWidth - 2 * margin) / 2;
     const labelX1 = margin + 2;
     const valueX1 = margin + 40;
     const labelX2 = margin + colWidth + 2;
     const valueX2 = margin + colWidth + 40;

     // Row 1
     doc.setFontSize(9);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Session Date:', labelX1, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.date || '-', valueX1, yPosition);

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Session Type:', labelX2, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text('Target Shooting', valueX2, yPosition);
     yPosition += 8;

     // Row 2
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Check-In:', labelX1, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.checkin_time || '-', valueX1, yPosition);

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Check-Out:', labelX2, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.checkout_time || '-', valueX2, yPosition);
     yPosition += 8;

     // Row 3 — Club / Range (resolve from multiple sources)
     const resolvedClubName = record.club_name || 
       (record.club_id && clubs[record.club_id]?.name) || 
       record.location_name || 
       record.range_name ||
       record.place_name ||
       record.venue_name ||
       'Not recorded';

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Club / Range:', labelX1, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(resolvedClubName, valueX1, yPosition);
     yPosition += 10;

     // ═══ SECTION 2: FIREARMS & AMMUNITION ═══
     if (record.rifles_used && record.rifles_used.length > 0) {
       doc.setFillColor(...STYLES.lightGray);
       doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
       doc.setFontSize(11);
       doc.setFont(undefined, 'bold');
       doc.setTextColor(...STYLES.headingColor);
       doc.text('FIREARMS & AMMUNITION', margin + 3, yPosition + 3.5);
       yPosition += 9;

       record.rifles_used.forEach((rifle, rIdx) => {
         const rifleData = rifles[rifle.rifle_id];

         if (yPosition > pageHeight - 60) {
           doc.addPage();
           pageNum++;
           addPageId(doc, docId, pageNum, pageWidth);
           yPosition = margin;
         }

         // Firearm header
         doc.setFontSize(10);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.text(`Firearm #${rIdx + 1} — ${rifleData?.name || 'Unknown Rifle'}`, margin + 3, yPosition);
         yPosition += 6;

         // Firearm details box
         doc.setDrawColor(220, 220, 220);
         doc.setLineWidth(0.5);
         doc.rect(margin + 2, yPosition, pageWidth - 2 * margin - 4, 30);
         yPosition += 3;

         doc.setFontSize(8.5);
         let detailY = yPosition;
         const labelWidth = 32;
         const labelX = margin + 8;
         const valueX = labelX + labelWidth;
         const rightLabelX = margin + 100;
         const rightValueX = rightLabelX + labelWidth;
         const maxValueWidth = rightLabelX - valueX - 2;

         // Left column
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Name:', labelX, detailY);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         const nameWrapped = doc.splitTextToSize(rifleData?.name || '-', maxValueWidth);
         doc.text(nameWrapped[0] || '-', valueX, detailY);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Make:', labelX, detailY + 5);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifleData?.make || '-', valueX, detailY + 5);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Model:', labelX, detailY + 10);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifleData?.model || '-', valueX, detailY + 10);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Calibre:', labelX, detailY + 15);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifleData?.caliber || '-', valueX, detailY + 15);

         // Right column
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Rounds Fired:', rightLabelX, detailY);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(String(rifle.rounds_fired || '-'), rightValueX, detailY);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Range Dist:', rightLabelX, detailY + 5);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(`${rifle.meters_range || '-'} m`, rightValueX, detailY + 5);

         if (rifleData?.serial_number) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Serial:', rightLabelX, detailY + 10);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           const serialWrapped = doc.splitTextToSize(rifleData.serial_number, pageWidth - rightValueX - margin - 4);
           doc.text(serialWrapped[0] || '-', rightValueX, detailY + 10);
         }

         yPosition += 33;

         // Ammunition box
         doc.setFillColor(245, 245, 250);
         doc.setDrawColor(200, 200, 220);
         doc.rect(margin + 2, yPosition, pageWidth - 2 * margin - 4, 20);
         yPosition += 3;

         doc.setFontSize(8.5);
         let ammoY = yPosition;
         const ammoLabelX = margin + 8;
         const ammoValueX = ammoLabelX + labelWidth;
         const ammoMaxValueWidth = rightLabelX - ammoValueX - 2;

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Ammunition:', ammoLabelX, ammoY);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         const ammoWrapped = doc.splitTextToSize(rifle.ammunition_brand || 'Not recorded', ammoMaxValueWidth);
         doc.text(ammoWrapped[0], ammoValueX, ammoY);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Type:', ammoLabelX, ammoY + 5);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         const typeWrapped = doc.splitTextToSize(rifle.bullet_type || 'Not recorded', ammoMaxValueWidth);
         doc.text(typeWrapped[0], ammoValueX, ammoY + 5);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Grain:', ammoLabelX, ammoY + 10);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifle.grain || 'Not recorded', ammoValueX, ammoY + 10);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Calibre:', rightLabelX, ammoY);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifle.caliber || 'Not recorded', rightValueX, ammoY);

         yPosition += 23;
       });
       yPosition += 3;
     }

     // ═══ SECTION 3: TARGET ANALYSIS ═══
     const groupsForRecord = targetGroups.filter(g => g.session_id === record.id);
     if (groupsForRecord && groupsForRecord.length > 0) {
       if (yPosition > pageHeight - 80) {
         doc.addPage();
         pageNum++;
         addPageId(doc, docId, pageNum, pageWidth);
         yPosition = margin;
       }

       doc.setFillColor(...STYLES.lightGray);
       doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
       doc.setFontSize(11);
       doc.setFont(undefined, 'bold');
       doc.setTextColor(...STYLES.headingColor);
       doc.text('TARGET ANALYSIS', margin + 3, yPosition + 3.5);
       yPosition += 9;

       groupsForRecord.forEach((group, gIdx) => {
         if (yPosition > pageHeight - 50) {
           doc.addPage();
           pageNum++;
           addPageId(doc, docId, pageNum, pageWidth);
           yPosition = margin;
         }

         // Group header
         doc.setFontSize(10);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.text(`Group ${gIdx + 1} — ${group.group_name || `Group ${gIdx + 1}`}`, margin + 3, yPosition);
         yPosition += 7;

         // Basic info: Shots + Distance
         doc.setFontSize(8.5);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Shots:', margin + 8, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(group.number_of_shots ? String(group.number_of_shots) : 'Not recorded', margin + 28, yPosition);
         yPosition += 5;

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Distance:', margin + 8, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(group.distance_override ? `${group.distance_override} m` : 'Not recorded', margin + 28, yPosition);
         yPosition += 8;

         // Measurements subsection
         const hasMeasurements = group.group_size_moa || group.group_size_mm || group.group_size_mrad;
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.setFontSize(8.5);
         doc.text('Measurements', margin + 8, yPosition);
         yPosition += 5;

         if (hasMeasurements) {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           if (group.group_size_moa) {
             doc.text(`MOA: ${group.group_size_moa.toFixed(2)}`, margin + 12, yPosition);
             yPosition += 4;
           }
           if (group.group_size_mm) {
             doc.text(`Size (mm): ${group.group_size_mm}`, margin + 12, yPosition);
             yPosition += 4;
           }
           if (group.group_size_mrad) {
             doc.text(`MRAD: ${group.group_size_mrad.toFixed(3)}`, margin + 12, yPosition);
             yPosition += 4;
           }
         } else {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           doc.text('Not recorded', margin + 12, yPosition);
           yPosition += 4;
         }
         yPosition += 2;

         // Point of Impact subsection
         const hasPOI = group.point_of_impact_x || group.point_of_impact_y;
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.setFontSize(8.5);
         doc.text('Point of Impact', margin + 8, yPosition);
         yPosition += 5;

         if (hasPOI) {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           doc.text(`X: ${(group.point_of_impact_x || 0).toFixed(1)}mm`, margin + 12, yPosition);
           yPosition += 4;
           doc.text(`Y: ${(group.point_of_impact_y || 0).toFixed(1)}mm`, margin + 12, yPosition);
           yPosition += 4;
         } else {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           doc.text('Not recorded', margin + 12, yPosition);
           yPosition += 4;
         }
         yPosition += 2;

         // Adjustment subsection
         const hasAdjustment = group.clicks_up_down || group.clicks_left_right;
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.setFontSize(8.5);
         doc.text('Adjustment', margin + 8, yPosition);
         yPosition += 5;

         if (hasAdjustment) {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           if (group.clicks_up_down) {
             doc.text(`Elevation: ${group.clicks_up_down} clicks`, margin + 12, yPosition);
             yPosition += 4;
           }
           if (group.clicks_left_right) {
             doc.text(`Windage: ${group.clicks_left_right} clicks`, margin + 12, yPosition);
             yPosition += 4;
           }
         } else {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           doc.text('Not recorded', margin + 12, yPosition);
           yPosition += 4;
         }
         yPosition += 2;

         // Notes
         if (group.notes) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.headingColor);
           doc.setFontSize(8.5);
           doc.text('Notes', margin + 8, yPosition);
           yPosition += 5;
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           const wrappedNotes = doc.splitTextToSize(group.notes, pageWidth - 2 * margin - 20);
           wrappedNotes.forEach(line => {
             doc.text(line, margin + 12, yPosition);
             yPosition += 3.5;
           });
           yPosition += 2;
         }

         // Target photo
         if (group.marked_photo_url || group.ai_marked_photo_url || group.photo_url) {
           if (yPosition > pageHeight - 60) {
             doc.addPage();
             pageNum++;
             addPageId(doc, docId, pageNum, pageWidth);
             yPosition = margin;
           }

           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.headingColor);
           doc.setFontSize(8.5);
           doc.text('Target Photo', margin + 8, yPosition);
           yPosition += 6;

           const photoWidth = 55;
           const photoHeight = 55;
           const photoX = margin + 10;

           try {
             const photoUrl = group.marked_photo_url || group.ai_marked_photo_url || group.photo_url;
             doc.addImage(photoUrl, 'JPEG', photoX, yPosition, photoWidth, photoHeight);
             doc.link(photoX, yPosition, photoWidth, photoHeight, { url: photoUrl });
             yPosition += photoHeight + 4;
           } catch (e) {
             doc.setDrawColor(200, 200, 200);
             doc.rect(photoX, yPosition, photoWidth, photoHeight);
             doc.setFontSize(8);
             doc.setFont(undefined, 'normal');
             doc.setTextColor(150, 0, 0);
             doc.text('Image unavailable', photoX + 5, yPosition + photoHeight / 2);
             yPosition += photoHeight + 4;
           }
         } else {
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           doc.text('No target photo recorded', margin + 8, yPosition);
           yPosition += 5;
         }

         yPosition += 5;
         });
         }

         // ═══ SECTION 4: NOTES ═══
         if (record.notes) {
       if (yPosition > pageHeight - 50) {
         doc.addPage();
         pageNum++;
         addPageId(doc, docId, pageNum, pageWidth);
         yPosition = margin;
       }

       doc.setFillColor(...STYLES.lightGray);
       doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
       doc.setFontSize(11);
       doc.setFont(undefined, 'bold');
       doc.setTextColor(...STYLES.headingColor);
       doc.text('SESSION NOTES', margin + 3, yPosition + 3.5);
       yPosition += 9;

       doc.setFontSize(9);
       doc.setFont(undefined, 'normal');
       doc.setTextColor(...STYLES.textColor);
       const wrappedNotes = doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 10);
       wrappedNotes.forEach(line => {
         if (yPosition > pageHeight - 20) {
           doc.addPage();
           pageNum++;
           addPageId(doc, docId, pageNum, pageWidth);
           yPosition = margin;
         }
         doc.text(line, margin + 5, yPosition);
           yPosition += 5;
         });
         yPosition += 8;
         }

         // ═══ SECTION 5: PHOTOS (Bottom) ═══
         if (record.photos && record.photos.length > 0) {
         if (yPosition > pageHeight - 80) {
           doc.addPage();
           pageNum++;
           addPageId(doc, docId, pageNum, pageWidth);
           yPosition = margin;
         }

         doc.setFillColor(...STYLES.lightGray);
         doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
         doc.setFontSize(11);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.text('PHOTOS', margin + 3, yPosition + 3.5);
         yPosition += 9;

         const photoWidth = 40;
         const photoHeight = 40;
         const photosPerRow = Math.floor((pageWidth - 2 * margin) / (photoWidth + 4));
         let photoX = margin + 5;
         let photoY = yPosition;
         let photoCount = 0;

         record.photos.forEach((photo) => {
           if (photoCount > 0 && photoCount % photosPerRow === 0) {
             photoY += photoHeight + 4;
             photoX = margin + 5;
           }

           if (photoY > pageHeight - 30) {
             doc.addPage();
             pageNum++;
             addPageId(doc, docId, pageNum, pageWidth);
             photoY = margin;
             photoX = margin + 5;
           }

           const photoUrl = typeof photo === 'string' ? photo : photo.url;
           try {
             doc.addImage(photoUrl, 'JPEG', photoX, photoY, photoWidth, photoHeight);
             doc.link(photoX, photoY, photoWidth, photoHeight, { url: photoUrl });
           } catch (e) {
             doc.setDrawColor(200, 200, 200);
             doc.rect(photoX, photoY, photoWidth, photoHeight);
             doc.setFontSize(7);
             doc.setFont(undefined, 'normal');
             doc.setTextColor(150, 0, 0);
             doc.text('N/A', photoX + 14, photoY + 18);
           }

           photoX += photoWidth + 4;
           photoCount++;
         });

         yPosition = photoY + photoHeight + 8;
         }

         yPosition += 4;
         });

         return yPosition;
         }

function renderClayShootingSection(doc, records, startY, pageWidth, pageHeight, shotguns, clubs, docId, pageNum, clayData = {}, locations = {}) {
  const { margin } = STYLES;
  let yPosition = startY;
  const scorecards = clayData.scorecards || {};
  const standsBySession = clayData.stands || {};

  const ensureSpace = (needed = 30) => {
    if (yPosition > pageHeight - needed) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin;
    }
  };

  const sectionHeader = (title) => {
    ensureSpace(18);
    doc.setFillColor(...STYLES.lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(title, margin + 3, yPosition + 3.5);
    yPosition += 9;
  };

  const field = (label, value, x, y) => {
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkGray);
    doc.text(label, x, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...STYLES.textColor);
    doc.text(String(value || 'Not recorded'), x + 34, y);
  };

  records.forEach((record, idx) => {
    if (idx > 0) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin;
    }

    const scorecard = scorecards[record.id];
    const stands = standsBySession[record.id] || [];
    const scoreSummary = getClayScoreSummary(scorecard, stands);
    const shotgun = shotguns[record.shotgun_id];
    const clubName = resolveClayClubName(record, clubs, locations);
    const duration = calculateDuration(record.checkin_time || record.start_time, record.checkout_time || record.end_time);
    const photos = normalizePhotos(record.photos || []);

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text('CLAY SHOOTING SESSION REPORT', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Detailed Activity Record', margin, yPosition);
    yPosition += 12;

    sectionHeader('SESSION OVERVIEW');
    field('Session Date:', record.date || '-', margin + 2, yPosition);
    field('Session Type:', 'Clay Shooting', margin + 100, yPosition);
    yPosition += 7;
    field('Club / Range:', clubName, margin + 2, yPosition);
    yPosition += 7;
    field('Check-In:', record.checkin_time || record.start_time || '-', margin + 2, yPosition);
    field('Check-Out:', record.checkout_time || record.end_time || '-', margin + 100, yPosition);
    yPosition += 7;
    if (duration) {
      field('Duration:', duration, margin + 2, yPosition);
      yPosition += 7;
    }
    if (record.notes) {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Notes:', margin + 2, yPosition);
      yPosition += 5;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...STYLES.textColor);
      doc.splitTextToSize(record.notes, pageWidth - 2 * margin - 8).forEach((line) => {
        ensureSpace(12);
        doc.text(line, margin + 5, yPosition);
        yPosition += 4;
      });
    }
    yPosition += 5;

    sectionHeader('SHOTGUN USED');
    field('Name:', shotgun?.name || 'Not recorded', margin + 2, yPosition);
    field('Make:', shotgun?.make || '-', margin + 100, yPosition);
    yPosition += 7;
    field('Model:', shotgun?.model || '-', margin + 2, yPosition);
    field('Gauge:', shotgun?.gauge || '-', margin + 100, yPosition);
    yPosition += 7;
    field('Serial:', shotgun?.serial_number || '-', margin + 2, yPosition);
    field('Cartridges:', record.rounds_fired || 0, margin + 100, yPosition);
    yPosition += 12;

    sectionHeader('CARTRIDGES / AMMUNITION');
    field('Brand/Name:', record.ammunition_used || 'Not recorded', margin + 2, yPosition);
    yPosition += 7;
    field('Gauge:', shotgun?.gauge || 'Not recorded', margin + 2, yPosition);
    field('Quantity:', record.rounds_fired || 0, margin + 100, yPosition);
    yPosition += 12;

    sectionHeader('SCORE CARD');
    if (scoreSummary) {
      field('Total:', scoreSummary.label, margin + 2, yPosition);
      field('Percentage:', `${scoreSummary.percentage}%`, margin + 100, yPosition);
      yPosition += 7;
      field('Hits:', scoreSummary.totalHits, margin + 2, yPosition);
      field('Missed:', scoreSummary.totalMisses, margin + 100, yPosition);
      yPosition += 9;

      stands.forEach((stand) => {
        ensureSpace(10);
        const valid = Number(stand.valid_scored_clays || ((stand.hits || 0) + (stand.misses || 0)));
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...STYLES.textColor);
        doc.text(`Stand ${stand.stand_number}${stand.discipline_type ? ` (${stand.discipline_type})` : ''}: ${stand.hits || 0} / ${valid}`, margin + 5, yPosition);
        yPosition += 5;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...STYLES.textColor);
      doc.text('No score card recorded', margin + 5, yPosition);
      yPosition += 7;
    }
    yPosition += 5;

    sectionHeader('PHOTOS');
    if (photos.length === 0) {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...STYLES.textColor);
      doc.text('No photos recorded', margin + 5, yPosition);
      yPosition += 10;
    } else {
      const photoWidth = 35;
      const photoHeight = 35;
      let x = margin + 5;
      photos.forEach((photoUrl, photoIndex) => {
        if (photoIndex > 0 && x + photoWidth > pageWidth - margin) {
          x = margin + 5;
          yPosition += photoHeight + 5;
        }
        ensureSpace(photoHeight + 12);
        try {
          doc.addImage(photoUrl, 'JPEG', x, yPosition, photoWidth, photoHeight);
          doc.link(x, yPosition, photoWidth, photoHeight, { url: photoUrl });
        } catch (e) {
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, yPosition, photoWidth, photoHeight);
          doc.setFontSize(7);
          doc.text('Image unavailable', x + 3, yPosition + 18);
        }
        x += photoWidth + 5;
      });
      yPosition += photoHeight + 8;
    }
  });

  return yPosition;
}

function renderDeerManagementSection(doc, records, startY, pageWidth, pageHeight, rifles, locations = {}, docId, pageNum) {
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

  const contentWidth = (pageWidth - 2 * margin) * 0.6;
  const photoX = margin + contentWidth + 28.35;
  const photoMaxWidth = pageWidth - photoX - margin;

  records.forEach((record, idx) => {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      pageNum++;
      addPageId(doc, docId, pageNum, pageWidth);
      yPosition = margin + 5;
    }

    let textY = yPosition;
    let photoY = yPosition;
    const photoSize = 18;
    const photosPerRow = Math.max(2, Math.floor(photoMaxWidth / (photoSize + 3)));

    // LEFT COLUMN - Activity Details
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(`Activity ${idx + 1}: ${record.date}`, margin, textY);
    textY += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkGray);
    doc.text('Location', margin + 2, textY);
    textY += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...STYLES.textColor);
    doc.text(`${record.place_name || 'Unknown'}`, margin + 5, textY);
    textY += 5;

    doc.setFontSize(8.5);
    doc.text(`Time: ${record.start_time || '-'} to ${record.end_time || '-'}`, margin + 2, textY);
    textY += 5;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.darkGray);
    doc.text('Activity Details', margin + 2, textY);
    textY += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...STYLES.textColor);
    doc.text(`Species: ${record.deer_species || '-'} | Total Harvested: ${record.total_count || '0'}`, margin + 5, textY);
    textY += 5;

    if (record.species_list && record.species_list.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Harvest Breakdown', margin + 2, textY);
      textY += 4;
      record.species_list.forEach(s => {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...STYLES.textColor);
        doc.text(`${s.species}: ${s.count}`, margin + 5, textY);
        textY += 3;
      });
      textY += 2;
    }

    if (record.rifle_id && rifles[record.rifle_id]) {
      const rifleData = rifles[record.rifle_id];
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Rifle Details', margin + 2, textY);
      textY += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${rifleData.name}`, margin + 5, textY);
      textY += 3.5;
      doc.setTextColor(80, 80, 80);
      doc.text(`Make: ${rifleData.make || '-'} | Model: ${rifleData.model || '-'} | Caliber: ${rifleData.caliber || '-'}`, margin + 5, textY);
      textY += 3.5;
      doc.text(`Serial: ${rifleData.serial_number || '-'}`, margin + 5, textY);
      textY += 5;
    }

    if (record.ammunition_used) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Ammunition', margin + 2, textY);
      textY += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(record.ammunition_used, margin + 5, textY);
      textY += 5;
    }

    if (record.notes) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Notes', margin + 2, textY);
      textY += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      const wrappedNotes = doc.splitTextToSize(record.notes, contentWidth - 5);
      wrappedNotes.forEach(line => {
        doc.text(line, margin + 5, textY);
        textY += 3.5;
      });
      textY += 2;
    }

    if (record.gps_track && record.gps_track.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('GPS Track', margin + 2, textY);
      textY += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`Points: ${record.gps_track.length}`, margin + 5, textY);
      textY += 3;
      if (record.gps_track[0]) {
        doc.text(`Start: ${record.gps_track[0].lat.toFixed(6)}, ${record.gps_track[0].lng.toFixed(6)}`, margin + 5, textY);
        textY += 3;
      }
      if (record.gps_track[record.gps_track.length - 1]) {
        doc.text(`End: ${record.gps_track[record.gps_track.length - 1].lat.toFixed(6)}, ${record.gps_track[record.gps_track.length - 1].lng.toFixed(6)}`, margin + 5, textY);
        textY += 5;
      }
    }

    // RIGHT COLUMN - Photos
    if (record.photos && record.photos.length > 0) {
      let pX = photoX;
      let pY = photoY;
      let photoCount = 0;

      record.photos.forEach((photo) => {
        if (photoCount > 0 && photoCount % photosPerRow === 0) {
          pY += photoSize + 3;
          pX = photoX;
        }

        try {
          doc.addImage(photo, 'JPEG', pX, pY, photoSize, photoSize);
          doc.link(pX, pY, photoSize, photoSize, { url: photo });
        } catch (e) {
          doc.setDrawColor(...STYLES.lightGray);
          doc.rect(pX, pY, photoSize, photoSize);
        }

        pX += photoSize + 3;
        photoCount++;
      });

      photoY = pY + photoSize + 3;
    } else {
      photoY = textY;
    }

    yPosition = Math.max(photoY, textY) + 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  return yPosition;
}