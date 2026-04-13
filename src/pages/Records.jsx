import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Download, Eye, Trash2 } from 'lucide-react';

export default function Records() {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allRecords]);

  const loadRecords = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let query = {};
      if (currentUser.role !== 'admin') {
        query.created_by = currentUser.email;
      }

      const [targetShoots, clayShoots, deerMgmt] = await Promise.all([
        base44.entities.TargetShooting.filter(query),
        base44.entities.ClayShooting.filter(query),
        base44.entities.DeerManagement.filter(query),
      ]);

      const records = [
        ...targetShoots.map((r) => ({ ...r, recordType: 'target' })),
        ...clayShoots.map((r) => ({ ...r, recordType: 'clay' })),
        ...deerMgmt.map((r) => ({ ...r, recordType: 'deer' })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setAllRecords(records);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allRecords;

    if (filters.type !== 'all') {
      filtered = filtered.filter((r) => r.recordType === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((r) => r.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((r) => r.date <= filters.dateTo);
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this record?')) return;
    try {
      const entityName = type === 'target' ? 'TargetShooting' : type === 'clay' ? 'ClayShooting' : 'DeerManagement';
      await base44.entities[entityName].delete(id);
      setAllRecords(allRecords.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
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

  return (
    <div>
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">All Records</h1>
          <p className="text-muted-foreground mb-6">View and manage all your shooting records</p>

          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Record Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="all">All Records</option>
                  <option value="target">Target Shooting</option>
                  <option value="clay">Clay Shooting</option>
                  <option value="deer">Deer Management</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={handleDelete} user={user} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RecordCard({ record, onDelete, user }) {
  const getRecordTitle = () => {
    if (record.recordType === 'target') return `Target Shooting - ${record.rounds_fired} rounds`;
    if (record.recordType === 'clay') return `Clay Shooting - ${record.rounds_fired} rounds`;
    if (record.recordType === 'deer') return `Deer: ${record.number_shot} ${record.deer_species}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{getRecordTitle()}</h3>
        <p className="text-sm text-muted-foreground">{record.date} • {getBadgeLabel(record.recordType)}</p>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1">
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(record.id, record.recordType)}
          className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getBadgeLabel(type) {
  if (type === 'target') return 'Target Shooting';
  if (type === 'clay') return 'Clay Shooting';
  if (type === 'deer') return 'Deer Management';
}