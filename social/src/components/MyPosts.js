import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import CreatePost from './CreatePost';
import './Dashboard.css';

const MyPosts = () => {
    const { signOut } = useClerk();
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    const currentUserId = user?.id;
    const reputationScore = user?.reputation_score || 0;
    const postQuality = user?.post_quality_avg || 0;
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

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
                body: JSON.stringify({ currentUserId }),
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

    const [expandedPosts, setExpandedPosts] = useState([]);
    const [commentsMap, setCommentsMap] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [commentInput, setCommentInput] = useState({});
    const [loadingComments, setLoadingComments] = useState({});
    const [replyInput, setReplyInput] = useState({});
    const [openReplies, setOpenReplies] = useState({});
    const [repliesMap, setRepliesMap] = useState({});
    const [loadingReplies, setLoadingReplies] = useState({});

    const toggleExpand = (postId) => {
        setExpandedPosts(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
    };

    const toggleComments = async (postId) => {
        const isOpen = !!openComments[postId];
        if (isOpen) {
            setOpenComments(prev => ({ ...prev, [postId]: false }));
            return;
        }
        setOpenComments(prev => ({ ...prev, [postId]: true }));
        if (!commentsMap[postId]) {
            await fetchComments(postId);
        }
    };

    const fetchComments = async (postId) => {
        try {
            setLoadingComments(prev => ({ ...prev, [postId]: true }));
            const res = await fetch(`http://localhost:5000/api/posts/${postId}/comments`);
            if (res.ok) {
                const data = await res.json();
                // The backend returns { comments: [ { comment: {...}, replies: [...] }, ... ] }
                const formattedComments = data.comments.map(item => item.comment);
                setCommentsMap(prev => ({ ...prev, [postId]: formattedComments }));

                // Pre-populate replies map
                const newReplies = {};
                data.comments.forEach(item => {
                    if (item.replies && item.replies.length > 0) {
                        newReplies[item.comment.id] = item.replies;
                    }
                });
                setRepliesMap(prev => ({ ...prev, ...newReplies }));
            }
        } catch (err) {
            console.error('Comments fetch error', err);
        } finally {
            setLoadingComments(prev => ({ ...prev, [postId]: false }));
        }
    };

    const handleAddComment = async (postId) => {
        const text = (commentInput[postId] || '').trim();
        if (!text) return;
        const newComment = {
            id: `tmp-${Date.now()}`,
            content: text,
            user: { id: currentUserId, username: user?.username, first_name: user?.firstName, profile_picture: user?.imageUrl },
            created_at: new Date().toISOString(),
            isTemp: true
        };
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
        setCommentInput(prev => ({ ...prev, [postId]: '' }));
        try {
            const res = await fetch(`http://localhost:5000/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, userId: currentUserId })
            });
            if (res.ok) {
                const saved = await res.json();
                setCommentsMap(prev => ({
                    ...prev,
                    [postId]: (prev[postId] || []).map(c => c.id === newComment.id ? saved : c)
                }));
            }
        } catch (err) {
            console.error('Add comment error', err);
        }
    };

    const handleDeleteComment = async (postId, commentId, commentUserId) => {
        if (commentUserId !== currentUserId) return;
        if (!window.confirm('Delete this comment?')) return;
        setCommentsMap(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
        try {
            const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, { method: 'DELETE' });
            if (!res.ok) console.error('Failed to delete comment');
        } catch (err) {
            console.error('Delete comment error', err);
        }
    };

    const toggleReplies = (commentId) => {
        setOpenReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const handleAddReply = async (commentId) => {
        const text = (replyInput[commentId] || '').trim();
        if (!text) return;
        const newReply = {
            id: `tmp-${Date.now()}`,
            content: text,
            user: { id: currentUserId, username: user?.username, first_name: user?.firstName, profile_picture: user?.imageUrl },
            created_at: new Date().toISOString(),
            isTemp: true
        };
        setRepliesMap(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), newReply] }));
        setReplyInput(prev => ({ ...prev, [commentId]: '' }));
        try {
            const post = posts.find(p => (commentsMap[p.id] || []).some(c => c.id === commentId));
            if (!post) return;

            const res = await fetch(`http://localhost:5000/api/posts/${post.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, userId: currentUserId, parentId: commentId })
            });
            if (res.ok) {
                const saved = await res.json();
                setRepliesMap(prev => ({
                    ...prev,
                    [commentId]: (prev[commentId] || []).map(r => r.id === newReply.id ? saved : r)
                }));
            }
        } catch (err) { console.error('Add reply error', err); }
    };

    const handleDeleteReply = async (commentId, replyId, replyUserId) => {
        if (replyUserId !== currentUserId) return;
        if (!window.confirm('Delete this reply?')) return;
        setRepliesMap(prev => ({ ...prev, [commentId]: (prev[commentId] || []).filter(r => r.id !== replyId) }));
        try {
            const res = await fetch(`http://localhost:5000/api/replies/${replyId}`, { method: 'DELETE' });
            if (!res.ok) console.error('Failed to delete reply');
        } catch (err) { console.error('Delete reply error', err); }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/posts/${postId}`, { method: 'DELETE' });
            if (res.ok) fetchPosts();
            else console.error('Failed to delete post');
        } catch (err) { console.error('Delete error', err); }
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        // Handle Marshmallow DateTime dump which might be naive UTC string
        let timeStr = timestamp;
        if (typeof timeStr === 'string' && !timeStr.endsWith('Z') && !timeStr.includes('+') && !timeStr.includes('-')) {
            timeStr += 'Z';
        }

        const now = new Date();
        const postDate = new Date(timeStr);
        const seconds = Math.floor((now - postDate) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return postDate.toLocaleDateString();
    };

    const formatContent = (content) => {
        if (!content) return null;
        const parts = content.split(/(\$[A-Z0-9]+)/g);
        return parts.map((part, index) => {
            if (part.match(/^\$[A-Z0-9]+$/)) {
                const symbol = part.substring(1); // remove $
                return (
                    <Link
                        key={index}
                        to={`/symbol/${symbol}`}
                        className="post-symbol-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
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
                                <span className="nav-icon"></span>
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
                                <span className="nav-icon"></span>
                                My Posts
                            </button>

                            {/* Reputation Stats Card */}
                            <div style={{
                                marginTop: '20px',
                                padding: '15px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    marginBottom: '10px',
                                    fontWeight: '500'
                                }}>
                                    YOUR STATS
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                            ⭐ Reputation
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: '#fff',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {reputationScore}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                            📊 Quality
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: '#fff',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {postQuality.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="signout-btn" onClick={handleSignOut}>
                            <span className="nav-icon"></span>
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
                                                    className="profile-avatar"
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
                                                <div className="post-badges">
                                                    {post.symbol_id && (
                                                        <Link to={`/symbol/${post.symbol_id}`} className="post-symbol" onClick={(e) => e.stopPropagation()}>
                                                            ${post.symbol_id}
                                                        </Link>
                                                    )}
                                                    {post.sentiment && post.sentiment !== 'Neutral' && (
                                                        <span className={`post-sentiment ${post.sentiment?.toLowerCase()}`}>
                                                            {post.sentiment === 'Bullish' && '📈 Bullish'}
                                                            {post.sentiment === 'Bearish' && '📉 Bearish'}
                                                            {post.sentiment_score ? ` • ${post.sentiment_score}%` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="post-content">
                                            <p className="content-text">{formatContent(post.content)}</p>
                                        </div>
                                        {post.image_attachment && (
                                            <div className="post-attachment">
                                                <img src={post.image_attachment} alt="Post attachment" />
                                            </div>
                                        )}

                                        <div className="post-actions">
                                            <div className="left-actions">
                                                <button
                                                    className={`like-button ${post.user_has_liked ? 'liked' : ''}`}
                                                    onClick={() => handleLike(post.id, post.user_has_liked)}
                                                >
                                                    <span className="like-icon">👍</span>
                                                    <span className="like-count">{post.likes_count || 0}</span>
                                                </button>
                                                <button
                                                    className="comments-toggle"
                                                    onClick={() => toggleComments(post.id)}
                                                >
                                                    💬 {post.comments_count || (commentsMap[post.id] || []).length || 0}
                                                </button>
                                            </div>
                                            <div className="right-actions">
                                                {post.user?.id === currentUserId && (
                                                    <>
                                                        <button className="delete-btn" onClick={() => handleDeletePost(post.id)}>Delete</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {openComments[post.id] && (
                                            <div className="comments-section">
                                                {loadingComments[post.id] ? (
                                                    <div className="comments-loading">Loading comments…</div>
                                                ) : (
                                                    <>
                                                        {(commentsMap[post.id] || []).map((c) => (
                                                            <div key={c.id} className="comment-item">
                                                                <img className="comment-avatar" src={c.user?.profile_picture || c.user?.imageUrl || 'https://via.placeholder.com/32'} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/32' }} />
                                                                <div className="comment-body">
                                                                    <div className="comment-meta">
                                                                        <span className="comment-author">{c.user?.first_name || c.user?.username}</span>
                                                                        <span className="comment-time">{formatTimeAgo(c.created_at)}</span>
                                                                        {c.user?.id === currentUserId && (
                                                                            <button className="comment-delete" onClick={() => handleDeleteComment(post.id, c.id, c.user?.id)}>Delete</button>
                                                                        )}
                                                                    </div>
                                                                    <div className="comment-content">{c.content}</div>
                                                                    <button className="reply-toggle" onClick={() => toggleReplies(c.id)}>
                                                                        ↳ Reply {repliesMap[c.id]?.length ? `(${repliesMap[c.id].length})` : ''}
                                                                    </button>
                                                                    {openReplies[c.id] && (
                                                                        <div className="replies-section">
                                                                            {loadingReplies[c.id] ? (
                                                                                <div className="replies-loading">Loading replies…</div>
                                                                            ) : (
                                                                                <>
                                                                                    {(repliesMap[c.id] || []).map((r) => (
                                                                                        <div key={r.id} className="reply-item">
                                                                                            <img className="reply-avatar" src={r.user?.profile_picture || r.user?.imageUrl || 'https://via.placeholder.com/28'} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/28' }} />
                                                                                            <div className="reply-body">
                                                                                                <div className="reply-meta">
                                                                                                    <span className="reply-author">{r.user?.first_name || r.user?.username}</span>
                                                                                                    <span className="reply-time">{formatTimeAgo(r.created_at)}</span>
                                                                                                    {r.user?.id === currentUserId && (
                                                                                                        <button className="reply-delete" onClick={() => handleDeleteReply(c.id, r.id, r.user?.id)}>Delete</button>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="reply-content">{r.content}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="reply-form">
                                                                                        <textarea
                                                                                            value={replyInput[c.id] || ''}
                                                                                            placeholder="Write a reply…"
                                                                                            onChange={(e) => setReplyInput(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                                                        />
                                                                                        <button className="btn-primary" onClick={() => handleAddReply(c.id)}>Reply</button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="comment-form">
                                                            <textarea
                                                                value={commentInput[post.id] || ''}
                                                                placeholder="Write a comment..."
                                                                onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                            />
                                                            <div className="comment-form-actions">
                                                                <button className="btn-primary" onClick={() => handleAddComment(post.id)}>Comment</button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
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
        </div >
    );
};

export default MyPosts;
