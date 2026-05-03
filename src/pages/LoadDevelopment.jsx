import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Search, ChevronRight, FlaskConical, Trash2, ArrowLeft, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import CreateTestModal from '@/components/load-development/CreateTestModal';
import TestDetailPage from '@/components/load-development/TestDetailPage';
import TestViewModal from '@/components/load-development/TestViewModal';
import { generateLoadTestPDF } from '@/utils/loadTestPDF';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';


const STATUS_COLORS = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Loaded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Tested: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Archived: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

export default function LoadDevelopment() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCaliber, setFilterCaliber] = useState('');
  const [user, setUser] = useState(null);
  const [viewTest, setViewTest] = useState(null);
  const [viewData, setViewData] = useState({ variants: [], results: [] });
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.ReloadingTest.filter({ created_by: u.email });
      setTests(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openView = async (e, test) => {
    e.stopPropagation();
    setViewTest(test);
    setViewLoading(true);
    try {
      const [variants, results] = await Promise.all([
        base44.entities.ReloadingTestVariant.filter({ test_id: test.id }),
        base44.entities.ReloadingTestResult.filter({ test_id: test.id }),
      ]);
      setViewData({ variants, results });
    } catch (err) { console.error(err); }
    finally { setViewLoading(false); }
  };

  const handleCreated = (test) => {
    setShowCreate(false);
    loadTests();
    setSelectedTest(test);
  };

  const handleDelete = async (e, testId) => {
    e.stopPropagation();
    if (!confirm('Delete this test? This will also delete all variants and results.')) return;
    try {
      // Delete related variants and results first
      const [variants, results] = await Promise.all([
        base44.entities.ReloadingTestVariant.filter({ test_id: testId }),
        base44.entities.ReloadingTestResult.filter({ test_id: testId }),
      ]);
      await Promise.all([
        ...variants.map(v => base44.entities.ReloadingTestVariant.delete(v.id)),
        ...results.map(r => base44.entities.ReloadingTestResult.delete(r.id)),
      ]);
      await base44.entities.ReloadingTest.delete(testId);
      loadTests();
    } catch (e) {
      console.error(e);
    }
  };

  const caliberOptions = [...new Set(tests.map(t => t.caliber).filter(Boolean))];
  const pullToRefresh = usePullToRefresh(loadTests, { disabled: showCreate || !!viewTest });

  const filtered = tests.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.caliber?.toLowerCase().includes(search.toLowerCase()) ||
      t.rifle_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchCaliber = !filterCaliber || t.caliber === filterCaliber;
    return matchSearch && matchStatus && matchCaliber;
  });

  if (selectedTest) {
    return (
      <TestDetailPage
        test={selectedTest}
        onBack={() => { setSelectedTest(null); loadTests(); }}
        onUpdated={(t) => { setSelectedTest(t); loadTests(); }}
      />
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link to="/reloading" className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Reloading Management
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Load Development</h1>
            </div>
            <p className="text-muted-foreground text-sm">Test and compare load variants with full inventory tracking</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Test</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Tests', value: tests.length },
            { label: 'Active', value: tests.filter(t => ['Draft','Loaded','Tested'].includes(t.status)).length },
            { label: 'Completed', value: tests.filter(t => t.status === 'Completed').length },
            { label: 'Calibers', value: caliberOptions.length },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tests..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            {['Draft','Loaded','Tested','Completed','Archived'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterCaliber}
            onChange={e => setFilterCaliber(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="">All Calibers</option>
            {caliberOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg mb-1">No tests yet</p>
            <p className="text-muted-foreground text-sm mb-4">Create your first load development test to get started</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Create Test
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(test => (
              <div
                key={test.id}
                onClick={() => setSelectedTest(test)}
                className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{test.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[test.status] || STATUS_COLORS.Draft}`}>
                        {test.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{test.caliber}{test.rifle_name ? ` · ${test.rifle_name}` : ''}</p>
                      {test.test_type && <p className="text-primary/70">{test.test_type}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span>{test.variant_count || 0} variant{(test.variant_count || 0) !== 1 ? 's' : ''}</span>
                        {test.test_date && <span>Test: {format(new Date(test.test_date), 'MMM d, yyyy')}</span>}
                        <span>Created: {format(new Date(test.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                    <button
                      onClick={(e) => openView(e, test)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="View test"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, test.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <TestViewModal
        open={!!(viewTest && !viewLoading)}
        test={viewTest}
        variants={viewData.variants}
        results={viewData.results}
        onClose={() => setViewTest(null)}
        onEdit={() => { setSelectedTest(viewTest); setViewTest(null); }}
        onExportPDF={viewTest ? () => {
          const doc = generateLoadTestPDF(viewTest, viewData.variants, viewData.results);
          doc.save(`load-test-${viewTest.name.replace(/\s+/g, '-')}.pdf`);
        } : undefined}
      />

      <CreateTestModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
    </div>
  );
}