import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Download, TrendingUp } from 'lucide-react';
import MobilePdfViewer from '@/components/MobilePdfViewer';
import { format } from 'date-fns';
import TargetShootingAnalytics from '@/components/analytics/TargetShootingAnalytics';
import ClayShootingAnalytics from '@/components/analytics/ClayShootingAnalytics';
import DeerManagementAnalytics from '@/components/analytics/DeerManagementAnalytics';
import {
  generateRecordPDF,
  generateMonthlySummaryPDF,
  generateCategoryReportPDF,
} from '@/utils/pdfExport';
import { generateFormalReport } from '@/utils/formalReportPDF';

export default function Reports() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('analytics');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('all');
  const [includeSignature, setIncludeSignature] = useState(false);
  const [selectedAnalyticsType, setSelectedAnalyticsType] = useState('target');
  const [user, setUser] = useState(null);
  const [previewPdf, setPreviewPdf] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const loadRecords = async () => {
    try {
      const currentUser = await base44.auth.me();

      // Load from the single global SessionRecord entity
      const sessionRecords = await base44.entities.SessionRecord.filter({ created_by: currentUser.email });

      const allRecords = sessionRecords.map((r) => {
        const recordTypeMap = {
          'target_shooting': 'target',
          'clay_shooting': 'clay',
          'deer_management': 'deer',
        };
        return { ...r, recordType: recordTypeMap[r.category] || r.category };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(allRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewReport = async () => {
    setPreviewLoading(true);
    try {
      let filteredRecords = records;
      let doc;

      if (reportType === 'formal') {
        if (records.length === 0) {
          alert('No records found to generate report');
          setPreviewLoading(false);
          return;
        }
        doc = await generateFormalReport(records, user, {});
      } else if (reportType === 'monthly') {
        filteredRecords = records.filter((r) => {
          const recordDate = new Date(r.date);
          return recordDate.getMonth() === month && recordDate.getFullYear() === year;
        });

        if (filteredRecords.length === 0) {
          alert('No records found for the selected month');
          setPreviewLoading(false);
          return;
        }
        doc = await generateMonthlySummaryPDF(filteredRecords, month, year, {
          includeSignatureLine: includeSignature,
        });
      } else if (reportType === 'category') {
        if (category === 'all') {
          if (records.length === 0) {
            alert('No records found');
            setPreviewLoading(false);
            return;
          }
          doc = await generateCategoryReportPDF(records, 'all', {});
        } else {
          filteredRecords = records.filter((r) => r.recordType === category);
          if (filteredRecords.length === 0) {
            alert('No records found for this category');
            setPreviewLoading(false);
            return;
          }
          doc = await generateCategoryReportPDF(filteredRecords, category, {});
        }
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewPdf(url);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      let filteredRecords = records;

      if (reportType === 'formal') {
        if (records.length === 0) {
          alert('No records found to generate report');
          return;
        }
        const doc = await generateFormalReport(records, user, {});
        doc.save(`Shooting_Activity_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
      } else if (reportType === 'monthly') {
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
          if (records.length === 0) { alert('No records found'); return; }
          const doc = await generateCategoryReportPDF(records, 'all', {});
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
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const filteredTarget = records.filter((r) => r.recordType === 'target');
  const filteredClay = records.filter((r) => r.recordType === 'clay');
  const filteredDeer = records.filter((r) => r.recordType === 'deer');

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">View detailed analytics and generate PDF reports of your shooting activities</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-6 mb-8">
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="formal"
                  checked={reportType === 'formal'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Formal Official Report PDF</span>
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
                  className={`p-3 rounded-xl border transition-colors text-sm font-medium ${
                    selectedAnalyticsType === 'target'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-primary'
                  }`}
                >
                  Target Shooting ({filteredTarget.length})
                </button>
                <button
                  onClick={() => setSelectedAnalyticsType('clay')}
                  className={`p-3 rounded-xl border transition-colors text-sm font-medium ${
                    selectedAnalyticsType === 'clay'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-primary'
                  }`}
                >
                  Clay Shooting ({filteredClay.length})
                </button>
                <button
                  onClick={() => setSelectedAnalyticsType('deer')}
                  className={`p-3 rounded-xl border transition-colors text-sm font-medium ${
                    selectedAnalyticsType === 'deer'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-primary'
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

          {reportType === 'formal' && (
            <div className="bg-blue-50/30 border border-blue-200/50 rounded-lg p-3">
              <p className="text-sm text-blue-900">📋 This generates a professional formal report suitable for submission to authorities including police and licensing bodies.</p>
            </div>
          )}

          {reportType !== 'analytics' && (
            <div className="flex gap-3">
              <button
                onClick={handlePreviewReport}
                disabled={previewLoading}
                className="flex-1 px-6 py-3 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium disabled:opacity-50"
              >
                {previewLoading ? '⏳ Generating...' : '👁️ Preview PDF'}
              </button>
              <button
                onClick={handleGenerateReport}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
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
        {previewPdf && (
          <MobilePdfViewer pdfUrl={previewPdf} onClose={() => setPreviewPdf(null)} />
        )}

        {reportType !== 'analytics' && (
          <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
           <h3 className="font-semibold mb-2">Report Information</h3>
           <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
             {reportType === 'formal' && (
               <>
                 <li>Comprehensive formal report with official formatting</li>
                 <li>Includes executive summary and detailed activity records</li>
                 <li>Suitable for submission to authorities and licensing bodies</li>
                 <li>Includes certification and signature sections</li>
                 <li>Professional header, footer, and page numbering</li>
               </>
             )}
             {reportType !== 'formal' && (
               <>
                 <li>Monthly summaries include all records from the selected month</li>
                 <li>Category reports group records by shooting type</li>
                 <li>PDFs are professionally formatted and ready for printing</li>
                 <li>Optional signature lines for official documentation</li>
               </>
             )}
           </ul>
         </div>
        )}
      </main>
    </div>
  );
}