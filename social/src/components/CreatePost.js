import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import './Dashboard.css';

// Mock Cerebras Client to match user's preferred syntax structure
class Cerebras {
    constructor({ api_key }) {
        this.api_key = api_key;
        this.chat = {
            completions: {
                create: async ({ model, messages, temperature, max_tokens, response_format }) => {
                    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.api_key}`
                        },
                        body: JSON.stringify({
                            model,
                            messages,
                            temperature,
                            max_tokens,
                            response_format
                        })
                    });
                    return await response.json();
                }
            }
        };
    }
}

const CreatePost = ({ onSuccess, onCancel }) => {
    const { user } = useUser();
    const [content, setContent] = useState('');
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const MAX_CHARS = 500;

    const convertBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
                resolve(fileReader.result);
            };
            fileReader.onerror = (error) => {
                reject(error);
            };
        });
    };

    const analyzeSentiment = async (text) => {
        if (!text || text.length < 10) return null;

        setAnalyzing(true);
        try {
            // Initialize client as requested
            const client = new Cerebras({
                api_key: process.env.REACT_APP_CEREBRAS_API_KEY
            });

            const data = await client.chat.completions.create({
                model: "qwen-3-235b-a22b-instruct-2507",
                messages: [
                    {
                        role: "system",
                        content: "You are a financial sentiment analyzer. Analyze the given text and return a JSON object with the following fields: 'sentiment' (must be one of: 'Bullish', 'Bearish', 'Neutral'), 'score' (confidence score between 0 and 100), and 'symbol' (extracted stock ticker if present, e.g. 'TSLA', otherwise null). Do not include any other text."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.1,
                max_tokens: 100,
                response_format: { type: "json_object" }
            });

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const result = JSON.parse(data.choices[0].message.content);

                // Normalize sentiment to ensure consistent state
                if (result.sentiment) {
                    const s = result.sentiment.toLowerCase();
                    if (s.includes('bullish')) result.sentiment = 'Bullish';
                    else if (s.includes('bearish')) result.sentiment = 'Bearish';
                    else result.sentiment = 'Neutral';
                }

                setAnalysis(result);

                // Auto-fill symbol if not already set and LLM found one
                if (result.symbol && !symbol) {
                    setSymbol(result.symbol.toUpperCase());
                }

                return result;
            }
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
        } finally {
            setAnalyzing(false);
        }
        return null;
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);

        // Regex to find first $SYMBOL
        const match = newContent.match(/\$([A-Za-z]+)/);
        if (match) {
            setSymbol(match[1].toUpperCase());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!content.trim()) {
            setMessage('Please enter post content');
            return;
        }

        if (content.length > MAX_CHARS) {
            setMessage(`Post content must be ${MAX_CHARS} characters or less`);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // Perform analysis if not already done
            let currentAnalysis = analysis;
            if (!currentAnalysis) {
                currentAnalysis = await analyzeSentiment(content);
            }

            console.log('data ', JSON.stringify({
                userId: JSON.parse(localStorage.getItem('user')).id,
                content: content.trim(),
                symbol: symbol.trim() || (currentAnalysis?.symbol || ''),
                sentiment: currentAnalysis ? currentAnalysis.sentiment : 'Neutral',
                sentimentScore: currentAnalysis ? currentAnalysis.score : 0,
                imageAttachment: attachment,
            }));

            // Commented out as per user request for debugging
            const response = await fetch('http://localhost:5000/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: JSON.parse(localStorage.getItem('user')).id,
                    content: content.trim(),
                    symbol: symbol.trim() || (currentAnalysis?.symbol || ''),
                    sentiment: currentAnalysis ? currentAnalysis.sentiment : 'Neutral',
                    sentimentScore: currentAnalysis ? currentAnalysis.score : 0,
                    sentimentReasoning: currentAnalysis ? currentAnalysis.reasoning : '',
                    imageAttachment: attachment,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create post');
            }

            const result = await response.json();
            console.log('Post created:', result);

            setMessage('Post created successfully! (Simulation)');

            // Call onSuccess prop if provided
            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }

        } catch (error) {
            console.error('Error creating post:', error);
            setMessage('Error creating post: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const charCount = content.length;
    const charCountClass = charCount > MAX_CHARS ? 'error' : charCount > MAX_CHARS * 0.9 ? 'warning' : '';

    return (
        <div className="create-post-form">
            {message && (
                <div className={`message ${message.includes('Error') || message.includes('must be') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="content">Post Content</label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={handleContentChange}
                        onBlur={() => analyzeSentiment(content)}
                        placeholder="Share your market analysis, trading insights, or investment thoughts... (e.g. $TSLA looks bullish)"
                        required
                        disabled={loading}
                    />
                    <div className={`character-counter ${charCountClass}`}>
                        {charCount} / {MAX_CHARS} characters
                    </div>
                </div>

                {/* AI Analysis Result */}
                {(analyzing || analysis) && (
                    <div className="ai-analysis-result" style={{
                        marginBottom: '15px',
                        padding: '10px',
                        background: analyzing ? '#f0f9ff' : (analysis?.sentiment === 'Bullish' ? '#ecfdf5' : analysis?.sentiment === 'Bearish' ? '#fef2f2' : '#f8fafc'),
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: analyzing ? '#bae6fd' : (analysis?.sentiment === 'Bullish' ? '#86efac' : analysis?.sentiment === 'Bearish' ? '#fca5a5' : '#e2e8f0')
                    }}>
                        {analyzing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7' }}>
                                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                                <span>Analyzing market sentiment...</span>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: analysis?.sentiment === 'Bullish' ? '#166534' : analysis?.sentiment === 'Bearish' ? '#991b1b' : '#475569' }}>
                                        {analysis?.sentiment === 'Bullish' && '📈 Bullish'}
                                        {analysis?.sentiment === 'Bearish' && '📉 Bearish'}
                                        {analysis?.sentiment === 'Neutral' && '➡️ Neutral'}
                                    </span>
                                    <span style={{ fontSize: '0.85em', color: '#64748b', fontWeight: '500' }}>
                                        Confidence: {analysis?.score}%
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9em', color: '#334155' }}>{analysis?.reasoning}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="attachment">Attachment (Optional)</label>
                    <input
                        id="attachment"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            if (e.target.files[0]) {
                                try {
                                    const base64 = await convertBase64(e.target.files[0]);
                                    setAttachment(base64);
                                } catch (err) {
                                    console.error('Error converting file:', err);
                                }
                            }
                        }}
                        disabled={loading}
                    />
                    {attachment && (
                        <div style={{ marginTop: '10px' }}>
                            <img src={attachment} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                            <button
                                type="button"
                                onClick={() => setAttachment(null)}
                                style={{ display: 'block', marginTop: '5px', background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    {onCancel && (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || charCount > MAX_CHARS}
                    >
                        {loading ? 'Publishing...' : 'Publish Post'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePost;