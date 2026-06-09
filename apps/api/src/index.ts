import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import resumesRouter from './routes/resumes';
import gapsRouter from './routes/gaps';
import roadmapRouter from './routes/roadmap';
import interviewsRouter from './routes/interviews';
import marketRouter from './routes/market';

dotenv.config();

if (process.env.AI_SERVICE_URL && !process.env.AI_SERVICE_URL.startsWith('http://') && !process.env.AI_SERVICE_URL.startsWith('https://')) {
  process.env.AI_SERVICE_URL = `http://${process.env.AI_SERVICE_URL}`;
}


const app = express();
const port = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  process.env.APP_URL, // production Vercel URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/resumes', resumesRouter);
app.use('/api/v1/gaps', gapsRouter);
app.use('/api/v1/roadmap', roadmapRouter);
app.use('/api/v1/interviews', interviewsRouter);
app.use('/api/v1/market', marketRouter);

app.get('/health', async (req, res) => {
  const dnsResults: any = {};
  const hostnamesToLookup = [
    'career-copilot-ai',
    'career-copilot-ai-m8kq',
    'career-copilot-ai.onrender.com',
    'career-copilot-ai-m8kq.onrender.com',
    'localhost'
  ];

  const { promises: dnsPromises } = require('dns');
  for (const host of hostnamesToLookup) {
    try {
      const addresses = await dnsPromises.lookup(host, { all: true });
      dnsResults[host] = addresses.map((a: any) => a.address);
    } catch (err: any) {
      dnsResults[host] = `Error: ${err.message} (${err.code})`;
    }
  }

  res.json({
    status: 'ok',
    service: 'career-copilot-api',
    dnsLookups: dnsResults
  });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
