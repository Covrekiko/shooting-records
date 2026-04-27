import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Filter, Search, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const CATEGORIES = {
  bug_report: 'Bug Report',
  improvement: 'Improvement',
  confusing: 'Confusing',
  design: 'Design',
  performance: 'Performance',
  missing_feature: 'Missing Feature',
  other: 'Other',
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  fixed: 'bg-green-100 text-green-800',
  not_planned: 'bg-slate-100 text-slate-800',
  need_more_info: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function BetaFeedbackAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);
      const allPosts = await base44.entities.BetaFeedbackPost.list();
      setPosts(allPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.warn('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (postId, newStatus) => {
    try {
      await base44.entities.BetaFeedbackPost.update(postId, { status: newStatus });
      loadPosts();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this feedback post?')) return;
    try {
      await base44.entities.BetaFeedbackPost.delete(postId);
      setSelectedPost(null);
      loadPosts();
    } catch (error) {
      alert('Error deleting post: ' + error.message);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || post.severity === filterSeverity;
    const matchesSearch = searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.screen_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSeverity && matchesSearch;
  });

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

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-6xl mx-auto px-3 pt-4 pb-8 mobile-page-padding">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Beta Feedback</h1>
          <p className="text-xs text-muted-foreground mt-1">Review and manage tester feedback</p>
        </div>

        {selectedPost ? (
          <FeedbackDetailAdmin
            post={selectedPost}
            user={user}
            onClose={() => setSelectedPost(null)}
            onStatusChange={handleUpdateStatus}
            onDelete={() => {
              handleDeletePost(selectedPost.id);
              setSelectedPost(null);
            }}
            onRefresh={loadPosts}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="improvement">Improvement</option>
                  <option value="confusing">Confusing</option>
                  <option value="design">Design</option>
                  <option value="performance">Performance</option>
                  <option value="missing_feature">Missing Feature</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="fixed">Fixed</option>
                  <option value="not_planned">Not Planned</option>
                  <option value="need_more_info">Need More Info</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="all">All Severity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No feedback posts</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Title</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Category</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Severity</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Tester</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => (
                      <motion.tr
                        key={post.id}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                        onClick={() => setSelectedPost(post)}
                        className="border-b border-border hover:cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3">{post.title}</td>
                        <td className="py-3 px-3">{CATEGORIES[post.category]}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 capitalize">{post.severity}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground truncate">{post.created_by}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{format(new Date(post.created_date), 'MMM d')}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FeedbackDetailAdmin({ post, user, onClose, onStatusChange, onDelete, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [adminNotes, setAdminNotes] = useState(post.admin_notes || '');
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      const postComments = await base44.entities.BetaFeedbackComment.filter({ post_id: post.id });
      setComments(postComments.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch (error) {
      console.warn('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await base44.entities.BetaFeedbackComment.create({
        post_id: post.id,
        comment: newComment,
      });
      setNewComment('');
      loadComments();
      onRefresh();
    } catch (error) {
      alert('Error adding comment: ' + error.message);
    }
  };

  const handleSaveAdminNotes = async () => {
    try {
      await base44.entities.BetaFeedbackPost.update(post.id, { admin_notes: adminNotes });
      onRefresh();
    } catch (error) {
      alert('Error saving notes: ' + error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-[50000] flex items-end sm:items-center sm:justify-center p-4"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-background rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">{post.title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl font-light"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Category</p>
              <p className="font-medium">{CATEGORIES[post.category]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Severity</p>
              <p className="font-medium capitalize">{post.severity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Status</p>
              <select
                value={post.status}
                onChange={(e) => onStatusChange(post.id, e.target.value)}
                className="px-2 py-1 border border-border rounded text-sm bg-background"
              >
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="in_progress">In Progress</option>
                <option value="fixed">Fixed</option>
                <option value="not_planned">Not Planned</option>
                <option value="need_more_info">Need More Info</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Screen</p>
              <p className="font-medium">{post.screen_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Tester</p>
              <p className="font-medium text-xs">{post.created_by}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Date</p>
              <p className="font-medium text-xs">{format(new Date(post.created_date), 'MMM d, yyyy')}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Description</p>
            <p className="text-sm text-foreground">{post.description}</p>
          </div>

          {post.steps_to_reproduce && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2">Steps</p>
              <p className="text-sm text-foreground whitespace-pre-line">{post.steps_to_reproduce}</p>
            </div>
          )}

          {post.device_info || post.browser_info ? (
            <div className="bg-secondary/30 rounded-lg p-3 text-sm">
              {post.device_info && <p>Device: {post.device_info}</p>}
              {post.browser_info && <p>Browser: {post.browser_info}</p>}
            </div>
          ) : null}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-2">Admin Notes</p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mb-2"
              rows="2"
              placeholder="Internal notes for this feedback..."
            />
            <button
              onClick={handleSaveAdminNotes}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold"
            >
              Save Notes
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-3">Comments</p>
            {loadingComments ? (
              <div className="text-center text-sm text-muted-foreground py-4">Loading...</div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-semibold">{comment.created_by}</p>
                    <p className="text-sm text-foreground mt-1">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(comment.created_date), 'MMM d HH:mm')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Reply to tester..."
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newComment.trim()) {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-secondary"
            >
              Close
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-semibold hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}