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
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  let aiStatus = 'unknown';
  let aiError = null;
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      aiStatus = await response.text();
    } else {
      aiStatus = `HTTP ${response.status}`;
    }
  } catch (err: any) {
    aiStatus = 'failed';
    aiError = {
      message: err.message,
      code: err.code,
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null
    };
  }
  res.json({
    status: 'ok',
    service: 'career-copilot-api',
    aiServiceUrl: AI_SERVICE_URL,
    aiServiceStatus: aiStatus,
    aiServiceError: aiError
  });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
