import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useClerk, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import CreatePost from './CreatePost';
import './Dashboard.css';

const Dashboard = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  // State for posts feed
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // State for modal
  const [showModal, setShowModal] = useState(false);

  // Fetch user's posts
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await fetch(`http://localhost:5000/api/posts/${JSON.parse(localStorage.getItem('user')).id}`);

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const handlePostCreated = () => {
    fetchPosts();
    setShowModal(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const seconds = Math.floor((now - postDate) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return postDate.toLocaleDateString();
  };

  return (
    <div className="dashboard-layout">
      <SignedOut>
        {() => navigate("/signin")}
      </SignedOut>

      <SignedIn>
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-content">
            {/* Profile Section */}
            <div className="profile-section">
              <div className="profile-avatar">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" />
                ) : (
                  <div className="avatar-placeholder">
                    {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="profile-name">{user?.firstName || user?.username}</h3>
              <p className="profile-email">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
              <button className="nav-item active">
                <span className="nav-icon">📊</span>
                Dashboard
              </button>
              <button className="nav-item" onClick={() => setShowModal(true)}>
                <span className="nav-icon">✏️</span>
                Create Post
              </button>
              <button className="nav-item">
                <span className="nav-icon">👥</span>
                Community
              </button>
              <button className="nav-item">
                <span className="nav-icon">⚙️</span>
                Settings
              </button>
            </nav>

            {/* Sign Out Button */}
            <button className="signout-btn" onClick={handleSignOut}>
              <span className="nav-icon">🚪</span>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="dashboard-container">
            {/* Dashboard Header */}
            <div className="dashboard-header">
              <h2>Welcome back, {user?.firstName || user?.username}!</h2>
              <p>Your market insights and trading community</p>
            </div>

            {/* Posts Feed */}
            <div className="posts-feed">
              <div className="feed-header">
                <h3>Your Recent Posts</h3>
                <button className="create-post-btn" onClick={() => setShowModal(true)}>
                  + New Post
                </button>
              </div>

              {loadingPosts ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <div key={post.id} className="post-card">
                    <div className="post-header">
                      <div className="post-meta">
                        {post.symbol_id && (
                          <span className="post-symbol">${post.symbol_id}</span>
                        )}
                        <span className={`post-sentiment ${post.sentiment?.toLowerCase()}`}>
                          {post.sentiment === 'Bullish' && '📈 Bullish'}
                          {post.sentiment === 'Neutral' && '➡️ Neutral'}
                          {post.sentiment === 'Bearish' && '📉 Bearish'}
                          {post.sentiment_score && ` (${post.sentiment_score}%)`}
                        </span>
                      </div>
                      <span className="post-time">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                    <p className="post-content">{post.content}</p>
                    {post.image_attachment && (
                      <div className="post-attachment">
                        <img src={post.image_attachment} alt="Post attachment" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <p>No posts yet. Click "New Post" to create your first post!</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Create Post Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create New Post</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <CreatePost
                onSuccess={handlePostCreated}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
};

export default Dashboard;
