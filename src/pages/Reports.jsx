import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Download, TrendingUp } from 'lucide-react';
import TargetShootingAnalytics from '@/components/analytics/TargetShootingAnalytics';
import ClayShootingAnalytics from '@/components/analytics/ClayShootingAnalytics';
import DeerManagementAnalytics from '@/components/analytics/DeerManagementAnalytics';
import {
  generateRecordPDF,
  generateMonthlySummaryPDF,
  generateCategoryReportPDF,
} from '@/utils/pdfExport';

export default function Reports() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('analytics');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('all');
  const [includeSignature, setIncludeSignature] = useState(false);
  const [selectedAnalyticsType, setSelectedAnalyticsType] = useState('target');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const currentUser = await base44.auth.me();

      const [targetShoots, clayShoots, deerMgmt] = await Promise.all([
        base44.entities.TargetShooting.filter({ created_by: currentUser.email }),
        base44.entities.ClayShooting.filter({ created_by: currentUser.email }),
        base44.entities.DeerManagement.filter({ created_by: currentUser.email }),
      ]);

      const allRecords = [
        ...targetShoots.map((r) => ({ ...r, recordType: 'target' })),
        ...clayShoots.map((r) => ({ ...r, recordType: 'clay' })),
        ...deerMgmt.map((r) => ({ ...r, recordType: 'deer' })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(allRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      let filteredRecords = records;

      if (reportType === 'monthly') {
        filteredRecords = records.filter((r) => {
          const recordDate = new Date(r.date);
          return recordDate.getMonth() === month && recordDate.getFullYear() === year;
        });

        if (filteredRecords.length === 0) {
          alert('No records found for the selected month');
          return;
        }

        const doc = await generateMonthlySummaryPDF(filteredRecords, month, year, {
          includeSignatureLine: includeSignature,
        });
        doc.save(`Shooting_Report_${year}_${String(month + 1).padStart(2, '0')}.pdf`);
      } else if (reportType === 'category') {
        if (category === 'all') {
          const doc = await generateCategoryReportPDF(records, 'target', {});
          doc.save(`All_Records_Report.pdf`);
        } else {
          filteredRecords = records.filter((r) => r.recordType === category);
          if (filteredRecords.length === 0) {
            alert('No records found for this category');
            return;
          }
          const doc = await generateCategoryReportPDF(filteredRecords, category, {});
          doc.save(`${category.charAt(0).toUpperCase() + category.slice(1)}_Report.pdf`);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const filteredTarget = records.filter((r) => r.recordType === 'target');
  const filteredClay = records.filter((r) => r.recordType === 'clay');
  const filteredDeer = records.filter((r) => r.recordType === 'deer');

  return (
    <div>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">View detailed analytics and generate PDF reports of your shooting activities</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-6 mb-8">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3">Report Type</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="analytics"
                  checked={reportType === 'analytics'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">View Analytics</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="monthly"
                  checked={reportType === 'monthly'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Monthly Summary PDF</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="category"
                  checked={reportType === 'category'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Category Report PDF</span>
              </label>
            </div>
          </div>

          {/* Analytics Selection */}
          {reportType === 'analytics' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Analytics Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedAnalyticsType('target')}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedAnalyticsType === 'target'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border hover:border-primary'
                  }`}
                >
                  Target Shooting ({filteredTarget.length})
                </button>
                <button
                  onClick={() => setSelectedAnalyticsType('clay')}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedAnalyticsType === 'clay'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border hover:border-primary'
                  }`}
                >
                  Clay Shooting ({filteredClay.length})
                </button>
                <button
                  onClick={() => setSelectedAnalyticsType('deer')}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedAnalyticsType === 'deer'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-border hover:border-primary'
                  }`}
                >
                  Deer Management ({filteredDeer.length})
                </button>
              </div>
            </div>
          )}

          {/* Report Options */}
          {reportType === 'monthly' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(year, i).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {reportType === 'category' && (
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="all">All Records</option>
                <option value="target">Target Shooting</option>
                <option value="clay">Clay Shooting</option>
                <option value="deer">Deer Management</option>
              </select>
            </div>
          )}

          {/* Options */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Include signature line for compliance</span>
            </label>
          </div>

          {reportType !== 'analytics' && (
            <button
              onClick={handleGenerateReport}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
            >
              <Download className="w-5 h-5" />
              Generate PDF Report
            </button>
          )}
        </div>

        {/* Analytics View */}
        {reportType === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-bold text-foreground">
              <TrendingUp className="w-6 h-6 text-primary" />
              Detailed Analytics
            </div>
            {selectedAnalyticsType === 'target' && <TargetShootingAnalytics records={filteredTarget} />}
            {selectedAnalyticsType === 'clay' && <ClayShootingAnalytics records={filteredClay} />}
            {selectedAnalyticsType === 'deer' && <DeerManagementAnalytics records={filteredDeer} />}
          </div>
        )}

        {/* Info */}
        {reportType !== 'analytics' && (
          <div className="mt-8 bg-secondary/20 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Report Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Monthly summaries include all records from the selected month</li>
              <li>Category reports group records by shooting type</li>
              <li>PDFs are professionally formatted and ready for printing</li>
              <li>Optional signature lines for official documentation</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}