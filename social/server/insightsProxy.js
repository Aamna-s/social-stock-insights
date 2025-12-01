const express = require('express');
const fetch = require('node-fetch'); // npm i node-fetch@2
const app = express();

const MASSIVE_API_URL = 'https://api.massive.example/insights'; // replace with real endpoint
const API_KEY = process.env.MASSIVE_API_KEY;
if (!API_KEY) console.warn('MASSIVE_API_KEY not set in env');

app.get('/api/insights', async (req, res) => {
  try {
    const r = await fetch(MASSIVE_API_URL, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    });
    const body = await r.text();
    if (!r.ok) return res.status(r.status).send(body);
    res.type('json').send(body);
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'proxy error' });
  }
});

// SSE stream: poll upstream and forward events
app.get('/api/insights/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  let stopped = false;
  const send = async () => {
    if (stopped) return;
    try {
      const r = await fetch(MASSIVE_API_URL, {
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
      });
      if (!r.ok) {
        res.write(`event: error\ndata: ${JSON.stringify({ status: r.status })}\n\n`);
        return;
      }
      const json = await r.json();
      res.write(`data: ${JSON.stringify(json)}\n\n`);
    } catch (err) {
      console.error('SSE fetch error', err);
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'fetch failed' })}\n\n`);
    }
  };

  send();
  const iv = setInterval(send, 10000);

  req.on('close', () => {
    stopped = true;
    clearInterval(iv);
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Insights proxy listening ${PORT}`));
}

module.exports = app;