import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import CreatePost from './CreatePost';
import './Dashboard.css';

const MyPosts = () => {
    const { signOut } = useClerk();
    const { user } = useUser();
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user) {
            fetchPosts();
        }
    }, [user]);

    const fetchPosts = async () => {
        try {
            setLoadingPosts(true);
            // Fetch ALL posts and filter client-side
            const response = await fetch('http://localhost:5000/api/posts');

            if (response.ok) {
                const data = await response.json();
                const allPosts = data.posts || [];
                // Filter for current user
                const myPosts = allPosts.filter(post => post.user?.username === user?.username);
                setPosts(myPosts);
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

    const handleLike = async (postId, isLiked) => {
        try {
            const userId = JSON.parse(localStorage.getItem('user')).id;

            // Optimistically update UI
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        user_has_liked: !isLiked,
                        likes_count: isLiked ? (post.likes_count || 1) - 1 : (post.likes_count || 0) + 1
                    };
                }
                return post;
            }));

            // Call API to toggle like
            const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                fetchPosts();
                console.error('Failed to toggle like');
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            fetchPosts();
        }
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
                <aside className="sidebar">
                    <div className="sidebar-content">
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

                        <div className="sidebar-nav" style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                className="nav-btn"
                                onClick={() => navigate('/dashboard')}
                                style={{
                                    padding: '10px',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1rem'
                                }}
                            >
                                <span className="nav-icon">🏠</span>
                                Community Feed
                            </button>
                            <button
                                className="nav-btn active"
                                style={{
                                    padding: '10px',
                                    textAlign: 'left',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1rem',
                                    borderRadius: '8px'
                                }}
                            >
                                <span className="nav-icon">👤</span>
                                My Posts
                            </button>
                        </div>

                        <button className="signout-btn" onClick={handleSignOut}>
                            <span className="nav-icon">🚪</span>
                            Sign Out
                        </button>
                    </div>
                </aside>

                <main className="main-content">
                    <div className="dashboard-container">
                        <div className="dashboard-header">
                            <h2>My Posts</h2>
                            <p>Manage and view your contributions</p>
                        </div>

                        <div className="posts-feed">
                            <div className="feed-header">
                                <h3>Your Posts</h3>
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
                                            <div className="author-info">
                                                <img
                                                    src={post.user?.profile_picture || post.user?.imageUrl || "https://via.placeholder.com/48"}
                                                    alt={post.user?.username}
                                                    className="post-avatar-small"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/48" }}
                                                />
                                                <div className="author-details">
                                                    <span className="author-name">
                                                        {post.user?.first_name} {post.user?.last_name}
                                                    </span>
                                                    <span className="author-username">@{post.user?.username}</span>
                                                    <span className="post-time">
                                                        {formatTimeAgo(post.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="post-meta">
                                                {post.symbol_id && (
                                                    <span className="post-symbol">${post.symbol_id}</span>
                                                )}
                                                {post.sentiment && post.sentiment !== 'Neutral' && (
                                                    <span className={`post-sentiment ${post.sentiment?.toLowerCase()}`}>
                                                        {post.sentiment === 'Bullish' && (
                                                            <span style={{ color: '#16a34a', fontWeight: '700' }}>Bullish</span>
                                                        )}
                                                        {post.sentiment === 'Bearish' && (
                                                            <span style={{ color: '#dc2626', fontWeight: '700' }}>Bearish</span>
                                                        )}
                                                        {post.sentiment_score && ` (${post.sentiment_score}%)`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="post-content">{post.content}</p>
                                        {post.image_attachment && (
                                            <div className="post-attachment">
                                                <img src={post.image_attachment} alt="Post attachment" />
                                            </div>
                                        )}

                                        <div className="post-actions">
                                            <button
                                                className={`like-button ${post.user_has_liked ? 'liked' : ''}`}
                                                onClick={() => handleLike(post.id, post.user_has_liked)}
                                            >
                                                <span className="like-icon">👍</span>
                                                <span className="like-count">{post.likes_count || 0}</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📝</div>
                                    <p>You haven't created any posts yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

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

export default MyPosts;
