import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import './Dashboard.css';
import './SentimentChart.css';

const SymbolDetails = ({ symbol }) => {
  const { symbolId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize user data to prevent re-parsing on every render
  const user =  JSON.parse(localStorage.getItem('user'));
 

  const reputationScore = user?.reputation_score || 0;
  const postQuality = user?.post_quality_avg || 0;
  const { signOut } = useClerk();
  const [sentimentStats, setSentimentStats] = useState({
    bullish: 0,
    bearish: 0,
    neutral: 0,
    total: 0
  });
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  const pollRef = useRef(null);

  const MASSIVE_KEY = process.env.REACT_APP_MASSIVE_API_KEY;
  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };
  useEffect(() => {
    if (!symbol || !MASSIVE_KEY) {
      setInsightsError('Missing symbol or API key');
      return;
    }

    let mounted = true;

    const fetchTickerEvents = async () => {
      try {
        setInsightsLoading(true);
        // Call Massive ticker events endpoint
        const url = `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(symbol)}/events?apikey=${encodeURIComponent(MASSIVE_KEY)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();

        if (!mounted) return;
        setInsights(json.results); // results contains events, name, etc.
        setInsightsError(null);
      } catch (err) {
        if (mounted) setInsightsError(err.message || 'Fetch failed');
      } finally {
        if (mounted) setInsightsLoading(false);
      }
    };
    // initial fetch + poll every 30s (adjust as needed)
    fetchTickerEvents();
    pollRef.current = setInterval(fetchTickerEvents, 30000);

    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [symbol, MASSIVE_KEY]);

  useEffect(() => {
    const fetchSymbolPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5000/api/posts/symbol/${symbolId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        const symbolPosts = data.posts || data; // Handle both {posts: [...]} and [...] responses

        // Calculate sentiment statistics
        const stats = {
          bullish: symbolPosts.filter(p => p.sentiment === 'Bullish').length,
          bearish: symbolPosts.filter(p => p.sentiment === 'Bearish').length,
          neutral: symbolPosts.filter(p => !p.sentiment || p.sentiment === 'Neutral').length,
          total: symbolPosts.length
        };

        setSentimentStats(stats);
        setPosts(symbolPosts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (symbolId) {
      fetchSymbolPosts();
    }
  }, [symbolId]);

  const getPercentage = (count) => {
    return sentimentStats.total > 0 ? ((count / sentimentStats.total) * 100).toFixed(1) : 0;
  };

  return (
    <div className="dashboard-layout">
      <SignedOut>
        {() => navigate("/signin")}
      </SignedOut>

      <SignedIn>
        {/* <aside className="sidebar">
          <div className="sidebar-content">
            <button className="nav-btn" onClick={() => navigate('/dashboard')}>
              <span className="nav-icon"></span> Back to Feed
            </button>
            <button className="nav-btn" onClick={() => navigate('/my-posts')}>
              <span className="nav-icon"></span> My Posts
            </button>
          </div>
        </aside> */}
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
              <h2>${symbolId}</h2>
              <p>Community Sentiment Analysis</p>
            </div>
            <div className="posts-feed">
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading sentiment data...</p>
                </div>
              ) : error ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⚠️</div>
                  <p>Error loading data: {error}</p>
                </div>
              ) : sentimentStats.total > 0 ? (
                <div className="sentiment-analysis">
                  <div className="sentiment-overview">
                    <h3>Community Sentiment</h3>
                    <p className="total-posts">{sentimentStats.total} posts about ${symbolId}</p>
                  </div>

                  <div className="sentiment-chart">
                    <div className="chart-bars">
                      <div className="chart-bar bullish">
                        <div className="bar-label">
                          <span className="sentiment-icon">📈</span>
                          <span>Bullish</span>
                        </div>
                        <div className="bar-container">
                          <div
                            className="bar-fill bullish-fill"
                            style={{ width: `${getPercentage(sentimentStats.bullish)}%` }}
                          ></div>
                        </div>
                        <div className="bar-stats">
                          <span className="count">{sentimentStats.bullish}</span>
                          <span className="percentage">{getPercentage(sentimentStats.bullish)}%</span>
                        </div>
                      </div>

                      <div className="chart-bar bearish">
                        <div className="bar-label">
                          <span className="sentiment-icon">📉</span>
                          <span>Bearish</span>
                        </div>
                        <div className="bar-container">
                          <div
                            className="bar-fill bearish-fill"
                            style={{ width: `${getPercentage(sentimentStats.bearish)}%` }}
                          ></div>
                        </div>
                        <div className="bar-stats">
                          <span className="count">{sentimentStats.bearish}</span>
                          <span className="percentage">{getPercentage(sentimentStats.bearish)}%</span>
                        </div>
                      </div>

                      <div className="chart-bar neutral">
                        <div className="bar-label">
                          <span className="sentiment-icon">➖</span>
                          <span>Neutral</span>
                        </div>
                        <div className="bar-container">
                          <div
                            className="bar-fill neutral-fill"
                            style={{ width: `${getPercentage(sentimentStats.neutral)}%` }}
                          ></div>
                        </div>
                        <div className="bar-stats">
                          <span className="count">{sentimentStats.neutral}</span>
                          <span className="percentage">{getPercentage(sentimentStats.neutral)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="recent-posts">
                    <h4>Recent Posts</h4>
                    <div className="posts-list">
                      {posts.slice(0, 5).map(post => (
                        <div key={post.id} className="post-preview">
                          <div className="post-preview-header">
                            <span className="author">{post.user?.first_name} {post.user?.last_name}</span>
                            {post.sentiment && post.sentiment !== 'Neutral' && (
                              <span className={`sentiment-badge ${post.sentiment?.toLowerCase()}`}>
                                {post.sentiment === 'Bullish' ? '📈' : '📉'} {post.sentiment}
                              </span>
                            )}
                          </div>
                          <p className="post-preview-content">{post.content.substring(0, 150)}{post.content.length > 150 ? '...' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p>No posts found for <strong>${symbolId}</strong></p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Be the first to share your insights!</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </SignedIn>
    </div>
  );
};

export default SymbolDetails;
