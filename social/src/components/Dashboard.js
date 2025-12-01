import React, { useEffect, useState, useRef } from 'react';
import { SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import CreatePost from './CreatePost';
import './Dashboard.css';
const Dashboard = () => {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  // memoize user so its reference doesn't change every render
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }, []);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState([]); // ids of expanded posts
  // comments state: map postId -> comments array
  const [commentsMap, setCommentsMap] = useState({});
  // map to track whether comments panel is open per post
  const [openComments, setOpenComments] = useState({});
  // per-post new comment input
  const [commentInput, setCommentInput] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [replyInput, setReplyInput] = useState({}); // map commentId -> reply text
  const [openReplies, setOpenReplies] = useState({}); // map commentId -> isOpen
  const [repliesMap, setRepliesMap] = useState({}); // map commentId -> replies array
  const [loadingReplies, setLoadingReplies] = useState({});
  const [tickers, setTickers] = useState([]);
  const [tickersLoading, setTickersLoading] = useState(false);
  const [tickersError, setTickersError] = useState(null);
  const MASSIVE_KEY = process.env.REACT_APP_MASSIVE_API_KEY;

  const tickersFetchedRef = useRef(false);

  const fetchTickers = async (symbols = ['AAPL','GOOGL','MSFT','AMZN','TSLA','NVDA','META']) => {
    if (tickersFetchedRef.current) return; // already fetched
    tickersFetchedRef.current = true;

    if (!MASSIVE_KEY) {
      setTickersError('MASSIVE_API_KEY not set');
      return;
    }

    setTickersLoading(true);
    try {
      const calls = symbols.map(s =>
        fetch(`https://api.massive.com/v3/reference/tickers?ticker=${encodeURIComponent(s)}&apikey=${encodeURIComponent(MASSIVE_KEY)}`)
          .then(r => r.ok ? r.json().catch(() => null) : null)
          .catch(() => null)
      );

      const responses = await Promise.all(calls);
      const results = [];
      for (const r of responses) {
        if (r && Array.isArray(r.results) && r.results[0]) results.push(r.results[0]);
      }
      setTickers(results);
      setTickersError(null);
    } catch (err) {
      setTickersError(err.message || 'Failed to fetch tickers');
    } finally {
      setTickersLoading(false);
    }
  };

  // Fetch tickers ONCE on mount
  useEffect(() => {
    fetchTickers(); // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty dependency array = run once on mount

  // helper to identify current user id (falls back to localStorage if needed)
  const currentUserId = user?.id || (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.id; } catch { return null; }
  })();

  // ---------- Reputation pipeline ----------
  // env flag to avoid calling remote LLM from the client (set to true for local heuristic)
  const USE_LOCAL_LLM = (process.env.REACT_APP_USE_LOCAL_LLM === 'true');

  // Gather current user's posts (try API then fallback to local state)
  const getUserPosts = async (userId) => {
    // try backend first
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/posts`);
      if (res.ok) {
        const data = await res.json();
        // assume data.results or array
        return data.results || data || [];
      }
    } catch (err) {
      console.warn('User posts fetch failed, falling back to local posts', err);
    }
    // fallback: filter in-memory posts state
    return posts.filter(p => p.user?.id === userId);
  };

  // Local heuristic LLM (insecure, simple fallback)
  const localHeuristicReputation = (userPosts) => {
    if (!userPosts || userPosts.length === 0) return { reputation_score: 0, post_quality_avg: 0 };
    // quality per post = normalized (likes_count*1 + comments_count*1 + length factor)
    const qualities = userPosts.map(p => {
      const likes = Number(p.likes_count || 0);
      const comments = Number(p.comments_count || 0) || (p.comments ? p.comments.length : 0);
      const lengthScore = Math.min(1, (p.content?.length || 0) / 280); // up to 1
      return likes * 1.2 + comments * 1.0 + lengthScore * 2;
    });
    const post_quality_avg = qualities.reduce((a,b)=>a+b,0) / qualities.length;
    // reputation scaled 0-100
    const reputation_score = Math.max(0, Math.min(100, Math.round(post_quality_avg * 3)));
    return { reputation_score, post_quality_avg: Number(post_quality_avg.toFixed(2)) };
  };

  // Main orchestrator: compute metrics via LLM (proxy) or local heuristic and update user record
  const computeAndUpdateReputation = async (userId) => {
    if (!userId) return;
    try {
      const userPosts = await getUserPosts(userId);

      let metrics = null;
      if (USE_LOCAL_LLM) {
        metrics = localHeuristicReputation(userPosts);
      } else {
        // call backend LLM service - implement server-side to keep LLM keys secret
        const res = await fetch('/api/llm/reputation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, posts: userPosts })
        });
        if (!res.ok) {
          throw new Error(`LLM proxy failed ${res.status}`);
        }
        metrics = await res.json(); // expect { reputation_score, post_quality_avg }
      }

      if (!metrics) throw new Error('No metrics returned');

      // Patch user with new metrics (adjust endpoint as needed)
      const patchRes = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reputation_score: metrics.reputation_score,
          post_quality_avg: metrics.post_quality_avg
        })
      });

      if (!patchRes.ok) {
        console.warn('Failed to update user metrics', await patchRes.text());
      } else {
        const updatedUser = await patchRes.json();
        // update local storage + in-memory user if present
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) { /* ignore */ }
        // if you hold user in state, update it here (e.g., setUser(updatedUser))
        console.log('Updated user reputation', metrics);
      }
    } catch (err) {
      console.error('Reputation pipeline error', err);
    }
  };
  // ---------- end reputation pipeline ----------

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
  };

  const toggleComments = async (postId) => {
    const isOpen = !!openComments[postId];
    if (isOpen) {
      setOpenComments(prev => ({ ...prev, [postId]: false }));
      return;
    }
    // open -> fetch comments if not loaded
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
      } else {
        console.error('Failed to load comments', res.status);
      }
    } catch (err) {
      console.error('Comments fetch error', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId) => {
    console.log('Adding comment to post---', postId);
    console.log('User:', user, '   ', currentUserId);
    const text = (commentInput[postId] || '').trim();
    if (!text) return;
    const newComment = {
      id: `tmp-${Date.now()}`,
      content: text,
      user: { id: currentUserId, username: user?.username, first_name: user?.firstName, profile_picture: user?.imageUrl },
      created_at: new Date().toISOString(),
      isTemp: true
    };
    // optimistic UI
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
        // replace temp comment with saved
        setCommentsMap(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(c => c.id === newComment.id ? saved : c)
        }));
      } else {
        console.error('Failed to save comment', res.status);
      }
    } catch (err) {
      console.error('Add comment error', err);
    }
  };

  const handleDeleteComment = async (postId, commentId, commentUserId) => {
    if (commentUserId !== currentUserId) return;
    if (!window.confirm('Delete this comment?')) return;
    // optimistic remove
    setCommentsMap(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to delete comment');
    } catch (err) {
      console.error('Delete comment error', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) fetchPosts();
      else console.error('Failed to delete post');
    } catch (err) { console.error('Delete error', err); }
  };

  useEffect(() => {
    // fetch posts once when user ID is present (depend on stable primitive)
    if (user?.id) fetchPosts();
  }, [user?.id]);

  // avoid calling navigate during render; redirect when signed out
  useEffect(() => {
    if (!user) navigate('/signin');
  }, [user, navigate]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      // Fetch ALL posts from all users
      const response = await fetch('http://localhost:5000/api/posts');

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
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return postDate.toLocaleDateString();
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
      // Find the post ID that contains this comment
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
            </div>

            <div className="sidebar-nav" style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <span className="nav-icon">🏠</span>
                Community Feed
              </button>
              <button
                className="nav-btn"
                onClick={() => navigate('/my-posts')}
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
              <h2>Welcome back, {user?.firstName || user?.username}!</h2>
              <p>Your market insights and trading community</p>
            </div>

            {/* Real-time Tickers Insights Panel */}
            <div className="tickers-insights">
              <div className="insights-header">
                <h4>📊 Active Tickers</h4>
                {tickersLoading && <span className="insights-loading">Updating…</span>}
              </div>
              {tickersError && <div className="insights-error">Error: {tickersError}</div>}
              {tickers.length > 0 ? (
                <div className="tickers-grid">
                  {tickers.map((ticker) => (
                    <div key={ticker.ticker} className="ticker-card">
                      <div className="ticker-symbol">{ticker.ticker}</div>
                      <div className="ticker-name">{ticker.name}</div>
                      <div className="ticker-meta">
                        <span className="ticker-market">{ticker.market}</span>
                        <span className="ticker-currency">{ticker.currency_symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insights-empty">No tickers loaded.</div>
              )}
            </div>

            <div className="posts-feed">
              <div className="feed-header">
                <h3>Community Feed</h3>
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
                  // highlight own posts visually
                  <div key={post.id} className={`post-card ${post.user?.id === currentUserId ? 'own-post' : ''}`}>
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
                          {post.user?.id === currentUserId && (
                            <span className="mine-badge" aria-label="Your post">Mine</span>
                          )}
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
                      {post.content.length > 300 ? (
                        <>
                          <p className={`content-text ${expandedPosts.includes(post.id) ? 'expanded' : 'clamped'}`}>
                            {expandedPosts.includes(post.id) ? formatContent(post.content) : formatContent(`${post.content.slice(0, 300)}...`)}
                          </p>
                          <button className="read-more" onClick={() => toggleExpand(post.id)}>
                            {expandedPosts.includes(post.id) ? 'Show less' : 'Read more'}
                          </button>
                        </>
                      ) : (
                        <p className="content-text">{formatContent(post.content)}</p>
                      )}
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
                          aria-pressed={post.user_has_liked}
                        >
                          <span className="like-icon">👍</span>
                          <span className="like-count">{post.likes_count || 0}</span>
                        </button>
                        <button
                          className="comments-toggle"
                          onClick={() => toggleComments(post.id)}
                          aria-expanded={!!openComments[post.id]}
                        >
                          💬 {post.comments_count || (commentsMap[post.id] || []).length || 0}
                        </button>
                      </div>
                      <div className="right-actions">
                        {post.user?.id === currentUserId && (
                          <>
                            <button className="edit-btn" onClick={() => navigate(`/edit-post/${post.id}`)}>Edit</button>
                            <button className="delete-btn" onClick={() => handleDeletePost(post.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Comments panel */}
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
                  <p>No posts yet. Click "New Post" to create your first post!</p>
                </div>
              )}
            </div>
          </div>
        </main >

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
      </SignedIn >
    </div >
  );
};

export default Dashboard;
