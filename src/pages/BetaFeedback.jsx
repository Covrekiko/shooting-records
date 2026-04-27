import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Search, Filter, MessageSquare, AlertCircle, Lightbulb, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const CATEGORIES = {
  bug_report: { label: 'Bug Report', icon: AlertCircle, color: 'text-red-500' },
  improvement: { label: 'Improvement', icon: Lightbulb, color: 'text-blue-500' },
  confusing: { label: 'Confusing', icon: Eye, color: 'text-yellow-500' },
  design: { label: 'Design', icon: 'palette', color: 'text-purple-500' },
  performance: { label: 'Performance', icon: 'zap', color: 'text-orange-500' },
  missing_feature: { label: 'Missing Feature', icon: 'plus', color: 'text-green-500' },
  other: { label: 'Other', icon: 'message', color: 'text-slate-500' },
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

export default function BetaFeedback() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Beta testers see only their own posts
      if (currentUser.role === 'beta_tester') {
        const userPosts = await base44.entities.BetaFeedbackPost.filter({ created_by: currentUser.email });
        setPosts(userPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      } else if (currentUser.role === 'admin') {
        // Admins see all posts
        const allPosts = await base44.entities.BetaFeedbackPost.list();
        setPosts(allPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }
    } catch (error) {
      console.warn('Error loading feedback posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (formData) => {
    try {
      await base44.entities.BetaFeedbackPost.create(formData);
      setShowForm(false);
      loadPosts();
    } catch (error) {
      alert('Error creating feedback: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateStatus = async (postId, newStatus) => {
    try {
      await base44.entities.BetaFeedbackPost.update(postId, { status: newStatus });
      loadPosts();
      if (selectedPost) setSelectedPost(null);
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.screen_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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

  if (user?.role !== 'beta_tester' && user?.role !== 'admin') {
    return (
      <div className="bg-background min-h-screen">
        <Navigation />
        <div className="max-w-2xl mx-auto px-3 pt-6 pb-8">
          <p className="text-center text-muted-foreground">Access denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-4 pb-8 mobile-page-padding">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feedback Forum</h1>
            <p className="text-xs text-muted-foreground mt-1">Help improve the app</p>
          </div>
          {user?.role === 'beta_tester' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Report
            </motion.button>
          )}
        </div>

        {showForm && (
          <FeedbackForm
            onSubmit={handleCreatePost}
            onCancel={() => setShowForm(false)}
          />
        )}

        {selectedPost && (
          <PostDetail
            post={selectedPost}
            user={user}
            onClose={() => setSelectedPost(null)}
            onStatusChange={handleUpdateStatus}
            onRefresh={loadPosts}
          />
        )}

        {!selectedPost && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
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
                <option value="other">Other</option>
              </select>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No feedback posts yet</p>
                {user?.role === 'beta_tester' && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
                  >
                    Create first feedback
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedPost(post)}
                    className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{post.screen_name}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                          {post.status}
                        </span>
                        {post.severity && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            post.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            post.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            post.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {post.severity}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{CATEGORIES[post.category]?.label}</span>
                      <span>{format(new Date(post.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FeedbackForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'bug_report',
    description: '',
    screen_name: '',
    severity: 'medium',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: '',
    device_info: '',
    browser_info: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Title and description are required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Report Feedback</h2>
        <button
          type="button"
          onClick={onCancel}
          className="hidden md:block px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="What's the issue or idea?"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="bug_report">Bug Report</option>
              <option value="improvement">Improvement</option>
              <option value="confusing">Confusing UI</option>
              <option value="design">Design Feedback</option>
              <option value="performance">Performance</option>
              <option value="missing_feature">Missing Feature</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Screen/Page *</label>
          <input
            type="text"
            value={formData.screen_name}
            onChange={(e) => setFormData({ ...formData, screen_name: e.target.value })}
            placeholder="e.g., Target Shooting / Checkout"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what happened or your idea..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            rows="3"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Expected Result</label>
          <input
            type="text"
            value={formData.expected_result}
            onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
            placeholder="What should happen instead?"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Steps to Reproduce</label>
          <textarea
            value={formData.steps_to_reproduce}
            onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
            placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            rows="2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Device</label>
            <input
              type="text"
              value={formData.device_info}
              onChange={(e) => setFormData({ ...formData, device_info: e.target.value })}
              placeholder="e.g., iPhone 13"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Browser</label>
            <input
              type="text"
              value={formData.browser_info}
              onChange={(e) => setFormData({ ...formData, browser_info: e.target.value })}
              placeholder="e.g., Safari, Chrome"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Submit Feedback
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function PostDetail({ post, user, onClose, onStatusChange, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
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
              <p className="font-medium">{CATEGORIES[post.category]?.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Severity</p>
              <p className="font-medium capitalize">{post.severity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Status</p>
              {user?.role === 'admin' ? (
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
              ) : (
                <p className="font-medium capitalize">{post.status}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Screen</p>
              <p className="font-medium">{post.screen_name}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Description</p>
            <p className="text-sm text-foreground">{post.description}</p>
          </div>

          {post.steps_to_reproduce && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2">Steps to Reproduce</p>
              <p className="text-sm text-foreground whitespace-pre-line">{post.steps_to_reproduce}</p>
            </div>
          )}

          {post.expected_result && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2">Expected Result</p>
              <p className="text-sm text-foreground">{post.expected_result}</p>
            </div>
          )}

          {(post.device_info || post.browser_info) && (
            <div className="bg-secondary/30 rounded-lg p-3 text-sm">
              {post.device_info && <p>Device: {post.device_info}</p>}
              {post.browser_info && <p>Browser: {post.browser_info}</p>}
            </div>
          )}

          {post.admin_notes && user?.role === 'admin' && (
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Admin Notes</p>
              <p className="text-sm text-foreground">{post.admin_notes}</p>
            </div>
          )}

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
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(comment.created_date), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                ))}
              </div>
            )}

            {user?.role === 'beta_tester' && post.created_by === user.email && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
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
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}