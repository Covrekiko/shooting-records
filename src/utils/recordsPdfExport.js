import { jsPDF } from 'jspdf';

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

export async function getRecordsPdfBlob(records, userInfo = null, rifles = {}, clubs = {}, shotguns = {}, locations = {}, targetGroups = []) {
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
      yPosition = renderClayShootingSection(doc, clayRecords, yPosition, pageWidth, pageHeight, shotguns, clubs, docId, pageNum);
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
     doc.setFontSize(16);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.headingColor);
     doc.text('TARGET SHOOTING SESSION REPORT', margin, yPosition);
     yPosition += 8;

     doc.setFontSize(11);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(100, 100, 100);
     doc.text('Detailed Activity Record', margin, yPosition);
     yPosition += 10;

     // ═══ SECTION 1: SESSION OVERVIEW ═══
     doc.setFillColor(...STYLES.lightGray);
     doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
     doc.setFontSize(11);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.headingColor);
     doc.text('SESSION OVERVIEW', margin + 3, yPosition + 3.5);
     yPosition += 8;

     // Overview grid
     const colWidth = (pageWidth - 2 * margin) / 2;
     doc.setFontSize(9);
     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);

     doc.text('Session Date:', margin, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.date, margin + 35, yPosition);

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Session Type:', margin + colWidth, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text('Target Shooting', margin + colWidth + 35, yPosition);
     yPosition += 6;

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Check-In:', margin, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.checkin_time || 'N/A', margin + 35, yPosition);

     doc.setFont(undefined, 'bold');
     doc.setTextColor(...STYLES.darkGray);
     doc.text('Check-Out:', margin + colWidth, yPosition);
     doc.setFont(undefined, 'normal');
     doc.setTextColor(...STYLES.textColor);
     doc.text(record.checkout_time || 'N/A', margin + colWidth + 35, yPosition);
     yPosition += 6;

     // Club/Range
     if (record.club_id && clubs[record.club_id]) {
       doc.setFont(undefined, 'bold');
       doc.setTextColor(...STYLES.darkGray);
       doc.text('Club / Range:', margin, yPosition);
       doc.setFont(undefined, 'normal');
       doc.setTextColor(...STYLES.textColor);
       doc.text(clubs[record.club_id].name || 'Unknown', margin + 35, yPosition);
       yPosition += 6;
       if (clubs[record.club_id].location) {
         doc.setFont(undefined, 'normal');
         doc.setFontSize(8);
         doc.text(clubs[record.club_id].location, margin + 35, yPosition);
         yPosition += 5;
       }
     }
     yPosition += 4;

     // ═══ SECTION 2: FIREARMS & AMMUNITION ═══
     if (record.rifles_used && record.rifles_used.length > 0) {
       doc.setFillColor(...STYLES.lightGray);
       doc.rect(margin, yPosition, pageWidth - 2 * margin, 5, 'F');
       doc.setFontSize(11);
       doc.setFont(undefined, 'bold');
       doc.setTextColor(...STYLES.headingColor);
       doc.text('FIREARMS & AMMUNITION', margin + 3, yPosition + 3.5);
       yPosition += 8;

       record.rifles_used.forEach((rifle, rIdx) => {
         const rifleData = rifles[rifle.rifle_id];

         // Firearm card background
         doc.setDrawColor(200, 200, 200);
         doc.rect(margin, yPosition, pageWidth - 2 * margin, 0.3);
         yPosition += 3;

         // Firearm title
         doc.setFontSize(10);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.text(`Firearm #${rIdx + 1}`, margin + 3, yPosition);
         yPosition += 5;

         // Firearm details
         doc.setFontSize(9);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Name:', margin + 5, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifleData?.name || 'Unknown', margin + 30, yPosition);
         yPosition += 5;

         if (rifleData) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Make:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           doc.text(rifleData.make || '-', margin + 30, yPosition);

           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Model:', margin + 100, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           doc.text(rifleData.model || '-', margin + 125, yPosition);
           yPosition += 5;

           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Caliber:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           doc.text(rifleData.caliber || '-', margin + 30, yPosition);

           if (rifleData.serial_number) {
             doc.setFont(undefined, 'bold');
             doc.setTextColor(...STYLES.darkGray);
             doc.text('Serial:', margin + 100, yPosition);
             doc.setFont(undefined, 'normal');
             doc.setTextColor(...STYLES.textColor);
             doc.text(rifleData.serial_number, margin + 125, yPosition);
           }
           yPosition += 5;
         }

         // Session details
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Rounds Fired:', margin + 5, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(`${rifle.rounds_fired || '0'} rounds`, margin + 30, yPosition);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Range Distance:', margin + 100, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(`${rifle.meters_range || '-'} m`, margin + 125, yPosition);
         yPosition += 5;

         // Ammunition
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Ammunition Brand:', margin + 5, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifle.ammunition_brand || '-', margin + 30, yPosition);
         yPosition += 5;

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Bullet Type:', margin + 5, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifle.bullet_type || '-', margin + 30, yPosition);

         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);
         doc.text('Grain Weight:', margin + 100, yPosition);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(...STYLES.textColor);
         doc.text(rifle.grain || '-', margin + 125, yPosition);
         yPosition += 6;
       });
     }

     // ═══ SECTION 3: TARGET ANALYSIS ═══
     const groupsForRecord = targetGroups.filter(g => g.session_id === record.id);
     if (groupsForRecord && groupsForRecord.length > 0) {
       if (yPosition > pageHeight - 100) {
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
       yPosition += 8;

       groupsForRecord.forEach((group, gIdx) => {
         if (yPosition > pageHeight - 50) {
           doc.addPage();
           pageNum++;
           addPageId(doc, docId, pageNum, pageWidth);
           yPosition = margin;
         }

         // Group card
         doc.setDrawColor(200, 200, 200);
         doc.rect(margin, yPosition, pageWidth - 2 * margin, 0.3);
         yPosition += 3;

         doc.setFontSize(10);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.headingColor);
         doc.text(`Group ${gIdx + 1}: ${group.group_name || `Group ${gIdx + 1}`}`, margin + 3, yPosition);
         yPosition += 5;

         doc.setFontSize(9);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(...STYLES.darkGray);

         if (group.number_of_shots) {
           doc.text('Shots:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           doc.text(String(group.number_of_shots), margin + 30, yPosition);
           yPosition += 5;
         }

         if (group.distance_override) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Distance:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           doc.text(`${group.distance_override} m`, margin + 30, yPosition);
           yPosition += 5;
         }

         if (group.group_size_moa || group.group_size_mm || group.group_size_mrad) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Group Size:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           const sizes = [];
           if (group.group_size_moa) sizes.push(`${group.group_size_moa.toFixed(2)} MOA`);
           if (group.group_size_mm) sizes.push(`${group.group_size_mm} mm`);
           if (group.group_size_mrad) sizes.push(`${group.group_size_mrad.toFixed(3)} mrad`);
           doc.text(sizes.join(' | '), margin + 30, yPosition);
           yPosition += 5;
         }

         if (group.point_of_impact_x || group.point_of_impact_y) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Point of Impact:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           const poiText = `X: ${(group.point_of_impact_x || 0).toFixed(1)}mm | Y: ${(group.point_of_impact_y || 0).toFixed(1)}mm`;
           doc.text(poiText, margin + 30, yPosition);
           yPosition += 5;
         }

         if (group.clicks_up_down || group.clicks_left_right) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Turret Clicks:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setTextColor(...STYLES.textColor);
           const clickText = `Elevation: ${group.clicks_up_down || '-'} | Windage: ${group.clicks_left_right || '-'}`;
           doc.text(clickText, margin + 30, yPosition);
           yPosition += 5;
         }

         if (group.notes) {
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Notes:', margin + 5, yPosition);
           doc.setFont(undefined, 'normal');
           doc.setFontSize(8);
           doc.setTextColor(...STYLES.textColor);
           const wrappedNotes = doc.splitTextToSize(group.notes, pageWidth - 2 * margin - 30);
           wrappedNotes.forEach((line, nIdx) => {
             doc.text(line, margin + 30, yPosition);
             yPosition += 3.5;
           });
           yPosition += 1;
         } else {
           yPosition += 2;
         }

         // Target photos
         if (group.marked_photo_url || group.ai_marked_photo_url || group.photo_url) {
           if (yPosition > pageHeight - 50) {
             doc.addPage();
             pageNum++;
             addPageId(doc, docId, pageNum, pageWidth);
             yPosition = margin;
           }

           doc.setFontSize(8);
           doc.setFont(undefined, 'bold');
           doc.setTextColor(...STYLES.darkGray);
           doc.text('Target Photo:', margin + 5, yPosition);
           yPosition += 4;

           const photoWidth = 40;
           const photoHeight = 40;
           const photoX = margin + 10;

           try {
             const photoUrl = group.marked_photo_url || group.ai_marked_photo_url || group.photo_url;
             doc.addImage(photoUrl, 'JPEG', photoX, yPosition, photoWidth, photoHeight);
             yPosition += photoHeight + 3;
           } catch (e) {
             doc.setTextColor(150, 0, 0);
             doc.setFontSize(8);
             doc.text('Image unavailable', photoX, yPosition + 18);
             yPosition += 25;
           }
         }

         yPosition += 2;
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
       yPosition += 8;

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
     }

     yPosition += 10;
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

    // LEFT COLUMN - Session Details
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...STYLES.headingColor);
    doc.text(`Session ${idx + 1}: ${record.date}`, margin, textY);
    textY += 6;

    if (record.club_id && clubs[record.club_id]) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Venue', margin + 2, textY);
      textY += 4;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${clubs[record.club_id].name}`, margin + 5, textY);
      textY += 3.5;
      doc.text(`${clubs[record.club_id].location || ''}`, margin + 5, textY);
      textY += 5;
    }

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...STYLES.textColor);
    doc.text(`Check-in: ${record.checkin_time || 'N/A'} | Check-out: ${record.checkout_time || 'N/A'} | Rounds: ${record.rounds_fired || '-'}`, margin + 2, textY);
    textY += 5;

    if (record.shotgun_id && shotguns[record.shotgun_id]) {
      const shotgunData = shotguns[record.shotgun_id];
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...STYLES.darkGray);
      doc.text('Shotgun Details', margin + 2, textY);
      textY += 4;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...STYLES.textColor);
      doc.text(`${shotgunData.name}`, margin + 5, textY);
      textY += 3.5;
      doc.setTextColor(80, 80, 80);
      doc.text(`Make: ${shotgunData.make || '-'} | Model: ${shotgunData.model || '-'} | Gauge: ${shotgunData.gauge || '-'}`, margin + 5, textY);
      textY += 3.5;
      doc.text(`Serial: ${shotgunData.serial_number || '-'}`, margin + 5, textY);
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