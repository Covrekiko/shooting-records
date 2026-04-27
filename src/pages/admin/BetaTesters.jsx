import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Trash2, Power, Search } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function BetaTesters() {
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTesters();
  }, []);

  const loadTesters = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);
      const allUsers = await base44.entities.User.list();
      const betaTesters = allUsers.filter(u => u.role === 'beta_tester');
      setTesters(betaTesters.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.warn('Error loading testers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTester = async (formData) => {
    try {
      await base44.users.inviteUser(formData.email, 'beta_tester');
      setShowForm(false);
      loadTesters();
      alert('Beta tester created successfully. Invite sent to ' + formData.email);
    } catch (error) {
      alert('Error creating beta tester: ' + (error.message || 'Unknown error'));
    }
  };

  const handleToggleStatus = async (testerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await base44.entities.User.update(testerId, { beta_tester_status: newStatus });
      loadTesters();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleDeleteTester = async (testerId, email) => {
    if (!confirm(`Remove beta tester ${email}?`)) return;
    try {
      await base44.entities.User.update(testerId, { role: 'normal_user', beta_tester_status: null });
      loadTesters();
    } catch (error) {
      alert('Error removing tester: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation />
        <div className="max-w-2xl mx-auto px-3 pt-6 pb-8">
          <p className="text-center text-muted-foreground">Admin access only</p>
        </div>
      </div>
    );
  }

  const filteredTesters = testers.filter(tester =>
    tester.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tester.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-4 pb-8 mobile-page-padding">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Beta Testers</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage beta testing users</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Tester
          </motion.button>
        </div>

        {showForm && (
          <CreateTesterForm
            onSubmit={handleCreateTester}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search testers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>

        {filteredTesters.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No beta testers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTesters.map((tester) => (
              <motion.div
                key={tester.id}
                whileHover={{ y: -2 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{tester.full_name || tester.email}</h3>
                    <p className="text-sm text-muted-foreground">{tester.email}</p>
                    {tester.beta_tester_notes && (
                      <p className="text-xs text-muted-foreground mt-2">{tester.beta_tester_notes}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tester.beta_tester_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tester.beta_tester_status || 'active'}
                      </span>
                      {tester.beta_tester_expires_at && (
                        <span className="text-xs text-muted-foreground">
                          Expires: {format(new Date(tester.beta_tester_expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(tester.id, tester.beta_tester_status)}
                      className={`p-2 rounded transition-colors ${
                        tester.beta_tester_status === 'active'
                          ? 'hover:bg-orange-100 text-orange-600'
                          : 'hover:bg-green-100 text-green-600'
                      }`}
                      title={tester.beta_tester_status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTester(tester.id, tester.email)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                      title="Remove tester"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateTesterForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    beta_tester_notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <h2 className="font-semibold text-lg mb-4">Create Beta Tester</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="tester@example.com"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Full Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Doe"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+44 1234 567890"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Testing Notes</label>
          <textarea
            value={formData.beta_tester_notes}
            onChange={(e) => setFormData({ ...formData, beta_tester_notes: e.target.value })}
            placeholder="e.g., Focus on mobile performance, iOS 15 testing"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            rows="3"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90"
          >
            Create & Invite
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}