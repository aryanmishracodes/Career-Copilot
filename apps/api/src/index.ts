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

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/resumes', resumesRouter);
app.use('/api/v1/gaps', gapsRouter);
app.use('/api/v1/roadmap', roadmapRouter);
app.use('/api/v1/interviews', interviewsRouter);
app.use('/api/v1/market', marketRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'career-copilot-api' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
