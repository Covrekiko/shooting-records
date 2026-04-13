import jsPDF from 'jspdf';
import { format } from 'date-fns';

const PRIMARY_COLOR = [230, 130, 40]; // Orange
const DARK_TEXT = [30, 30, 30];
const LIGHT_TEXT = [100, 100, 100];
const BORDER_COLOR = [200, 200, 200];
const HEADER_BG = [250, 250, 250];

function addHeader(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Background
  doc.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
  doc.rect(0, 0, pageWidth, 25, 'F');
  

  
  // Page numbers
  doc.setFontSize(9);
  doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
  doc.setFont(undefined, 'normal');
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 15, 20);
  
  // Separator line
  doc.setLineWidth(0.5);
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.line(10, 26, pageWidth - 10, 26);
}

function addFooter(doc, pageWidth) {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Separator line
  doc.setLineWidth(0.5);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
  
  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
  doc.setFont(undefined, 'normal');
  doc.text('Shooting Records Management System', 10, pageHeight - 8);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, pageWidth - 50, pageHeight - 8);
}

function addSection(doc, title, yPos) {
  doc.setFontSize(12);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont(undefined, 'bold');
  doc.text(title, 15, yPos);
  
  // Underline
  doc.setLineWidth(0.3);
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.line(15, yPos + 2, 80, yPos + 2);
  
  return yPos + 8;
}

export async function generateFormalReport(records, user, options = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let pageNum = 1;
  let yPos = 35;
  
  // Title page
  addHeader(doc, pageNum, 'TBD');
  
  // Report title
  doc.setFontSize(24);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont(undefined, 'bold');
  doc.text('OFFICIAL SHOOTING ACTIVITY REPORT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Report reference
  const reportRef = `SRM-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  doc.setFontSize(10);
  doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
  doc.text(`Reference: ${reportRef}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // Separator
  doc.setLineWidth(1);
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.line(30, yPos, pageWidth - 30, yPos);
  yPos += 15;
  
  // Key information
  doc.setFontSize(11);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.setFont(undefined, 'bold');
  doc.text('Report Information:', 15, yPos);
  yPos += 8;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const reportInfo = [
    `Generated: ${format(new Date(), 'EEEE, MMMM dd, yyyy HH:mm:ss')}`,
    `Report Type: Comprehensive Activity Summary`,
    `User: ${user.full_name || 'Unknown'}`,
    `Email: ${user.email}`,
    `Records Included: ${records.length}`,
    `Period: ${records.length > 0 ? `${records[records.length - 1].date} to ${records[0].date}` : 'N/A'}`,
  ];
  
  reportInfo.forEach((info) => {
    doc.text(info, 15, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  addFooter(doc, pageWidth);
  
  // Page 2: Executive Summary
  doc.addPage();
  pageNum++;
  addHeader(doc, pageNum, 'TBD');
  yPos = 35;
  
  yPos = addSection(doc, 'EXECUTIVE SUMMARY', yPos);
  
  const targetRecords = records.filter((r) => r.recordType === 'target');
  const clayRecords = records.filter((r) => r.recordType === 'clay');
  const deerRecords = records.filter((r) => r.recordType === 'deer');
  
  const totalRounds = records.reduce((sum, r) => sum + (r.rounds_fired || r.number_shot || 0), 0);
  
  doc.setFontSize(10);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.setFont(undefined, 'normal');
  
  const summaryStats = [
    ['Total Sessions:', `${records.length}`],
    ['Target Shooting:', `${targetRecords.length} sessions`],
    ['Clay Shooting:', `${clayRecords.length} sessions`],
    ['Deer Management:', `${deerRecords.length} activities`],
    ['Total Rounds Fired:', `${totalRounds}`],
  ];
  
  summaryStats.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 15, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(value, 70, yPos);
    yPos += 7;
  });
  
  yPos += 10;
  yPos = addSection(doc, 'ACTIVITY BREAKDOWN', yPos);
  
  // Activity breakdown by type
  const activityBreakdown = [
    {
      type: 'Target Shooting',
      count: targetRecords.length,
      rounds: targetRecords.reduce((sum, r) => sum + (r.rounds_fired || 0), 0),
    },
    {
      type: 'Clay Shooting',
      count: clayRecords.length,
      rounds: clayRecords.reduce((sum, r) => sum + (r.rounds_fired || 0), 0),
    },
    {
      type: 'Deer Management',
      count: deerRecords.length,
      rounds: deerRecords.reduce((sum, r) => sum + (r.number_shot || 0), 0),
    },
  ];
  
  activityBreakdown.forEach(({ type, count, rounds }) => {
    if (count > 0) {
      doc.setFont(undefined, 'bold');
      doc.text(`${type}:`, 15, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(`${count} records | ${rounds} total rounds`, 70, yPos);
      yPos += 7;
    }
  });
  
  addFooter(doc, pageWidth);
  
  // Page 3+: Detailed Records
  let recordsPerPage = 8;
  let recordIndex = 0;
  
  while (recordIndex < records.length) {
    doc.addPage();
    pageNum++;
    addHeader(doc, pageNum, 'TBD');
    yPos = 35;
    
    yPos = addSection(doc, 'DETAILED ACTIVITY RECORDS', yPos);
    
    const pageRecords = records.slice(recordIndex, recordIndex + recordsPerPage);
    
    pageRecords.forEach((record, idx) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        pageNum++;
        addHeader(doc, pageNum, 'TBD');
        yPos = 35;
        yPos = addSection(doc, 'DETAILED ACTIVITY RECORDS (continued)', yPos);
      }
      
      // Record box
      doc.setLineWidth(0.2);
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.rect(12, yPos - 3, pageWidth - 24, 22);
      
      // Record type badge
      const recordType = record.recordType === 'target' ? 'Target Shooting' : 
                        record.recordType === 'clay' ? 'Clay Shooting' : 'Deer Management';
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.text(recordType, 15, yPos + 2);
      
      doc.setFontSize(10);
      doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
      doc.setFont(undefined, 'bold');
      doc.text(`Date: ${record.date}`, pageWidth - 50, yPos + 2);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      let detailY = yPos + 9;
      if (record.recordType === 'target') {
        doc.text(`Club: ${record.club_id ? 'Recorded' : 'N/A'} | Rounds: ${record.rifles_used?.reduce((s, r) => s + (r.rounds_fired || 0), 0) || 0}`, 15, detailY);
      } else if (record.recordType === 'clay') {
        doc.text(`Club: ${record.club_id ? 'Recorded' : 'N/A'} | Rounds: ${record.rounds_fired || 0}`, 15, detailY);
      } else {
        doc.text(`Location: ${record.place_name || 'N/A'} | Species: ${record.deer_species || 'N/A'} | Count: ${record.total_count || 0}`, 15, detailY);
      }
      
      yPos += 25;
    });
    
    recordIndex += recordsPerPage;
    addFooter(doc, pageWidth);
  }
  
  // Final page: Certification
  doc.addPage();
  pageNum++;
  const totalPages = doc.getNumberOfPages();
  addHeader(doc, pageNum, totalPages);
  

  
  doc.setPage(totalPages);
  yPos = 40;
  
  yPos = addSection(doc, 'CERTIFICATION & SIGNATURE', yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
  doc.setFont(undefined, 'normal');
  
  const certText = `This report contains a comprehensive record of shooting activities and deer management
operations conducted by ${user.full_name || 'the account holder'} as documented in the Shooting Records
Management System. All information contained herein is accurate to the best of the account
holder's knowledge and has been compiled in accordance with relevant regulations and best practices.

This document is suitable for submission to relevant authorities including local police, game
management agencies, or licensing bodies as required by applicable law. The system timestamps
and data integrity are maintained automatically.

Report Reference: ${reportRef}`;
  
  doc.text(certText, 15, yPos, { maxWidth: pageWidth - 30, align: 'left' });
  
  yPos = pageHeight - 60;
  
  // Signature lines
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Account Holder Signature:', 15, yPos);
  doc.line(15, yPos + 10, 60, yPos + 10);
  doc.text('Date:', 70, yPos);
  doc.line(80, yPos + 10, 110, yPos + 10);
  
  yPos += 20;
  doc.text('Authorized Representative (if applicable):', 15, yPos);
  doc.line(15, yPos + 10, 60, yPos + 10);
  doc.text('Date:', 70, yPos);
  doc.line(80, yPos + 10, 110, yPos + 10);
  
  addFooter(doc, pageWidth);
  
  return doc;
}