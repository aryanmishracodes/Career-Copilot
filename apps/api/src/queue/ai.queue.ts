import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ── Redis connection ───────────────────────────────────────────────────────────
// Single shared connection for both Queue and Worker.
// lazyConnect: don't connect until first use.
// maxRetriesPerRequest: null required by BullMQ.
// retryStrategy: exponential backoff, give up after 5 attempts so logs don't spam.

let _redisAvailable = false;
let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (_connection) return _connection;

  _connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null; // stop retrying — Redis not available
      return Math.min(times * 500, 5000);
    },
  });

  _connection.on('connect', () => {
    _redisAvailable = true;
    console.log('[QUEUE] Redis connected');
  });

  _connection.on('error', (err) => {
    if (_redisAvailable) {
      console.warn('[QUEUE] Redis connection lost:', err.message);
      _redisAvailable = false;
    }
  });

  _connection.on('close', () => {
    _redisAvailable = false;
  });

  return _connection;
}

// ── Queue ──────────────────────────────────────────────────────────────────────

let _queue: Queue | null = null;

function getQueue(): Queue | null {
  if (!_redisAvailable) return null;
  if (!_queue) {
    _queue = new Queue('ai-jobs', { connection: getConnection() });
  }
  return _queue;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const aiQueue = {
  add: async (name: string, data: any) => {
    const q = getQueue();
    if (!q) {
      // Redis not available — process synchronously via direct HTTP
      await processResumeDirect(data);
      return;
    }
    return q.add(name, data);
  },
};

// ── Direct processing fallback ────────────────────────────────────────────────

const db = (() => {
  const { getDb } = require('@career-copilot/db');
  return getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');
})();

async function processResumeDirect(data: { resumeId: string; userId: string; fileBuffer: string; mimeType: string }) {
  const { resumeId, fileBuffer, mimeType } = data;
  try {
    const response = await fetch('http://localhost:8000/resume/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_id: resumeId,
        user_id: data.userId,
        file_b64: fileBuffer,
        mime_type: mimeType,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('[QUEUE] Direct parse failed:', response.status);
      return;
    }

    const result = await response.json();
    const cleanText = (result.raw_text || '').replace(/\x00/g, '');
    const { sql } = await import('drizzle-orm');

    await db.execute(
      sql`UPDATE resumes SET raw_text = ${cleanText}, parsed_json = ${JSON.stringify(result.structured)}, embedding_id = ${result.embedding_id} WHERE id = ${resumeId}`
    );
  } catch (error) {
    console.error('[QUEUE] Direct processing error:', (error as Error).message);
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────
// Only start if Redis connects successfully. Errors are caught and logged once.

async function startWorker() {
  const conn = getConnection();
  try {
    await conn.connect();
    _redisAvailable = true;

    const worker = new Worker('ai-jobs', async (job) => {
      if (job.name === 'parse-resume') {
        await processResumeDirect(job.data);
      }
    }, { connection: conn });

    worker.on('failed', (job, err) => {
      console.error(`[QUEUE] Job ${job?.id} failed:`, err.message);
    });

    // Suppress the repeated "Stream isn't writeable" errors from BullMQ internals
    worker.on('error', (err) => {
      if (!err.message.includes('Stream isn') && !err.message.includes('enableOfflineQueue')) {
        console.error('[QUEUE] Worker error:', err.message);
      }
    });

    console.log('[QUEUE] Worker started');
  } catch {
    // Redis not available — silent, direct processing will be used instead
  }
}

startWorker();
