import jsPDF from 'jspdf';

export async function generateRecordPDF(record, options = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(230, 130, 40); // Primary color
  doc.text('🎯 Shooting Records', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 8;

  // Record Details
  doc.setFontSize(14);
  doc.setTextColor(0);
  const recordType =
    record.recordType === 'target'
      ? 'Target Shooting'
      : record.recordType === 'clay'
        ? 'Clay Shooting'
        : 'Deer Management';
  doc.text(`${recordType} Record`, 10, yPos);
  yPos += 10;

  doc.setFontSize(11);
  const details = [
    ['Date:', record.date],
    ['Time:', `${record.checkin_time || record.start_time} - ${record.checkout_time || record.end_time}`],
  ];

  if (record.recordType === 'target') {
    details.push(
      ['Rounds Fired:', record.rounds_fired || 'N/A'],
      ['Ammunition:', record.ammunition_brand || 'N/A'],
      ['Bullet Type:', record.bullet_type || 'N/A'],
      ['Grain:', record.grain || 'N/A'],
      ['Notes:', record.notes || 'None']
    );
  } else if (record.recordType === 'clay') {
    details.push(
      ['Rounds Fired:', record.rounds_fired || 'N/A'],
      ['Notes:', record.notes || 'None']
    );
  } else {
    details.push(
      ['Species:', record.deer_species || 'N/A'],
      ['Number Shot:', record.number_shot || 'N/A'],
      ['Ammunition:', record.ammunition_used || 'N/A'],
      ['Notes:', record.notes || 'None']
    );
  }

  details.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 10, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), 50, yPos);
    yPos += 7;
  });

  // Signature line if requested
  if (options.includeSignatureLine) {
    yPos += 10;
    doc.line(10, yPos, 60, yPos);
    yPos += 3;
    doc.setFontSize(9);
    doc.text('Signature', 10, yPos);
  }

  return doc;
}

export async function generateMonthlySummaryPDF(records, month, year, options = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(230, 130, 40);
  doc.text('🎯 Shooting Records', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Monthly Summary: ${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 10, yPos);
  yPos += 12;

  // Summary stats
  const targetRecords = records.filter((r) => r.recordType === 'target');
  const clayRecords = records.filter((r) => r.recordType === 'clay');
  const deerRecords = records.filter((r) => r.recordType === 'deer');

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Summary Statistics:', 10, yPos);
  yPos += 8;

  doc.setFont(undefined, 'normal');
  const stats = [
    [`Target Shooting Sessions: ${targetRecords.length}`],
    [`Clay Shooting Sessions: ${clayRecords.length}`],
    [`Deer Management Outings: ${deerRecords.length}`],
    [`Total Rounds (Target): ${targetRecords.reduce((sum, r) => sum + (r.rounds_fired || 0), 0)}`],
    [`Total Rounds (Clay): ${clayRecords.reduce((sum, r) => sum + (r.rounds_fired || 0), 0)}`],
    [`Total Deer: ${deerRecords.reduce((sum, r) => sum + (r.number_shot || 0), 0)}`],
  ];

  stats.forEach((stat) => {
    doc.text(stat[0], 10, yPos);
    yPos += 7;
  });

  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 8;

  // Detailed records
  doc.setFont(undefined, 'bold');
  doc.text('Detailed Records:', 10, yPos);
  yPos += 8;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  records.forEach((record) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 10;
    }

    const recordType =
      record.recordType === 'target'
        ? 'Target'
        : record.recordType === 'clay'
          ? 'Clay'
          : 'Deer';
    doc.text(`${record.date} - ${recordType}`, 10, yPos);
    yPos += 6;
  });

  return doc;
}

export async function generateCategoryReportPDF(records, category, options = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;

  const categoryName =
    category === 'target' ? 'Target Shooting' : category === 'clay' ? 'Clay Shooting' : 'Deer Management';

  doc.setFontSize(20);
  doc.setTextColor(230, 130, 40);
  doc.text('🎯 Shooting Records', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`${categoryName} Report`, 10, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Overview:', 10, yPos);
  yPos += 8;

  doc.setFont(undefined, 'normal');
  const stats = [
    [`Total Sessions: ${records.length}`],
    [
      `Total Rounds: ${records.reduce((sum, r) => sum + (r.rounds_fired || r.number_shot || 0), 0)}`,
    ],
    [`Date Range: ${records[0]?.date} to ${records[records.length - 1]?.date}`],
  ];

  stats.forEach((stat) => {
    doc.text(stat[0], 10, yPos);
    yPos += 7;
  });

  return doc;
}