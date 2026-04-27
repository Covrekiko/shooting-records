import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Link } from 'react-router-dom';
import { UserPlus, MoreVertical, Ban, Pause, MessageCircle, Users } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    addressLine1: '',
    city: '',
    postcode: '',
    country: '',
    role: 'user',
  });
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

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      await base44.users.inviteUser(formData.email, formData.role);
      setShowForm(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        dateOfBirth: '',
        addressLine1: '',
        city: '',
        postcode: '',
        country: '',
        role: 'user',
      });
      loadUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
    }
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
             Invite New User
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

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Invite New User</h2>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email*</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">First Name*</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name*</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Postcode</label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Invite User
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    No users found. Invite someone to get started.
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-6 py-4 text-sm font-medium">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary'}`}>
                      {user.role}
                    </span>
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
                          <button
                            onClick={() => handleStatusChange(user.id, 'suspended')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 border-b border-border"
                          >
                            <Pause className="w-4 h-4" />
                            Suspend User
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