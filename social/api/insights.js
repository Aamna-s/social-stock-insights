// Vercel serverless function (also works on many Node lambda platforms)
export default async function handler(req, res) {
  const API_URL = 'https://api.massive.example/v1/insights'; // replace with real Massive URL
  const API_KEY = process.env.MASSIVE_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'MASSIVE_API_KEY not set' });

  try {
    const r = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      method: 'GET'
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    // forward JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (err) {
    console.error('insights proxy error', err);
    res.status(500).json({ error: 'proxy error' });
  }
}