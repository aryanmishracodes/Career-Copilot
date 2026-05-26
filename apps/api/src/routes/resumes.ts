import { Router } from 'express';
import multer from 'multer';
import { eq, and } from 'drizzle-orm';
import { getDb, resumes } from '@career-copilot/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { aiQueue } from '../queue/ai.queue';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');

router.post('/upload', authMiddleware, upload.single('resume'), async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  const file = req.file;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Deactivate previous resumes
    await db.update(resumes)
      .set({ is_active: false })
      .where(eq(resumes.user_id, userId));

    // Store raw resume placeholder
    const [resume] = await db.insert(resumes).values({
      user_id: userId,
      raw_text: '', // will be filled by AI job
      parsed_json: {},
      is_active: true,
    }).returning();

    // Queue async AI processing
    await aiQueue.add('parse-resume', {
      resumeId: resume.id,
      userId,
      fileBuffer: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    });

    res.json({ resumeId: resume.id, status: 'processing' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [resume] = await db.select().from(resumes)
      .where(and(eq(resumes.id, req.params.id), eq(resumes.user_id, userId)));

    if (!resume) return res.status(404).json({ error: 'Not found' });

    res.json({
      status: resume.parsed_json && Object.keys(resume.parsed_json).length > 0 ? 'ready' : 'processing',
      data: resume.parsed_json,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/latest', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [resume] = await db.select().from(resumes)
      .where(and(eq(resumes.user_id, userId), eq(resumes.is_active, true)));

    if (!resume) return res.status(404).json({ error: 'No resume found' });

    res.json(resume);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
