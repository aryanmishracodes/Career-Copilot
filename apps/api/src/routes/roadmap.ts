import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, users, userSkills, roadmapItems } from '@career-copilot/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const targetRole = req.body.targetRole || 'Software Engineer';

  try {
    // In reality, we fetch current skills and gaps from the DB
    const currentSkills = ['Python', 'JavaScript'];
    const skillGaps = ['React', 'System Design'];

    // Call Python FastAPI
    const response = await fetch(`${AI_SERVICE_URL}/roadmap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_skills: currentSkills, skill_gaps: skillGaps, target_role: targetRole }),
    });

    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }

    const roadmapData = await response.json();

    // Insert into DB
    const insertedItems = [];
    for (const item of roadmapData) {
      const [dbItem] = await db.insert(roadmapItems).values({
        user_id: userId,
        title: item.title,
        description: item.why_this_matters,
        est_weeks: item.week_end - item.week_start + 1,
        resources: item.learning_resources,
      }).returning();
      insertedItems.push(dbItem);
    }

    res.json(insertedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
