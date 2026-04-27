import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import Navigation from '@/components/Navigation';
import { Link } from 'react-router-dom';
import { UserPlus, MoreVertical, Ban, Pause, MessageCircle, Users, Zap, Search } from 'lucide-react';
import CreateUserForm from '@/components/admin/CreateUserForm';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { invalidateUserCache } = useAuth();
  const [selectedUserMenu, setSelectedUserMenu] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = (userData) => {
    setShowForm(false);
    loadUsers();
    invalidateUserCache();
    alert(`User ${userData.email} created successfully with role: ${userData.role}`);
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await base44.entities.User.update(userId, { status: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      setSelectedUserMenu(null);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleMakeBetaTester = async (userId) => {
    try {
      const res = await base44.functions.invoke('updateUserRole', { userId, newRole: 'beta_tester' });
      if (res.data.success) {
        setUsers(users.map(u => u.id === userId ? { 
          ...u, 
          role: 'beta_tester', 
          status: 'active',
          beta_tester_status: 'active'
        } : u));
        // Clear cached user profile to ensure next login picks up new role
        localStorage.removeItem('cachedUserProfile');
        invalidateUserCache();
        setSelectedUserMenu(null);
      }
    } catch (error) {
      console.error('Error making beta tester:', error);
      alert('Error promoting user: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const fullName = `${user.full_name || `${user.firstName} ${user.lastName}`}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || fullName.includes(query) || email.includes(query);
    return matchesRole && matchesSearch;
  });

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

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8 mobile-page-padding">
         <div className="mb-8">
           <h1 className="text-3xl font-bold mb-2">User Management</h1>
           <p className="text-muted-foreground">Manage users, roles, and permissions</p>
         </div>

         <div className="flex gap-3 mb-6 flex-wrap">
           <button
             onClick={() => setShowForm(!showForm)}
             className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
           >
             <UserPlus className="w-5 h-5" />
             Create User
           </button>
           <Link
             to="/admin/beta-testers"
             className="px-6 py-3 bg-secondary text-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
           >
             <Users className="w-5 h-5" />
             Beta Testers
           </Link>
           <Link
             to="/admin/beta-feedback"
             className="px-6 py-3 bg-secondary text-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
           >
             <MessageCircle className="w-5 h-5" />
             Feedback
           </Link>
           </div>

         {/* Search and filter */}
         <div className="flex gap-3 mb-6 flex-wrap">
           <div className="flex-1 min-w-[200px] relative">
             <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
             <input
               type="text"
               placeholder="Search by name or email..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background text-sm"
             />
           </div>
           <select
             value={filterRole}
             onChange={(e) => setFilterRole(e.target.value)}
             className="px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
           >
             <option value="all">All Roles</option>
             <option value="admin">Admin</option>
             <option value="normal_user">Normal User</option>
             <option value="beta_tester">Beta Tester</option>
           </select>
         </div>

        {showForm && (
          <CreateUserForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Beta Expires</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    {users.length === 0 ? 'No users found. Create one to get started.' : 'No users match your filters.'}
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-6 py-4 text-sm font-medium">{user.full_name || `${user.firstName} ${user.lastName}`}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                      user.role === 'admin' ? 'bg-primary/20 text-primary' : 
                      user.role === 'beta_tester' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 
                      'bg-secondary text-foreground'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'beta_tester' ? 'Beta Tester' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      user.status === 'suspended' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {user.status?.charAt(0).toUpperCase() + user.status?.slice(1) || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {user.role === 'beta_tester' && user.beta_tester_expires_at
                      ? new Date(user.beta_tester_expires_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setSelectedUserMenu(selectedUserMenu === user.id ? null : user.id)}
                        className="p-2 hover:bg-secondary rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {selectedUserMenu === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-10" onMouseLeave={() => setSelectedUserMenu(null)}>
                          {user.role !== 'beta_tester' && (
                            <button
                              onClick={() => handleMakeBetaTester(user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 border-b border-border text-primary"
                            >
                              <Zap className="w-4 h-4" />
                              Make Beta Tester
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(user.id, user.status === 'suspended' ? 'active' : 'suspended')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 border-b border-border"
                          >
                            <Pause className="w-4 h-4" />
                            {user.status === 'suspended' ? 'Reactivate' : 'Suspend'} User
                          </button>
                          <button
                            onClick={() => handleStatusChange(user.id, 'banned')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary text-destructive flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Ban User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}