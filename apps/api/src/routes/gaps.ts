import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, users, userSkills, jobs } from '@career-copilot/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');

router.get('/analysis', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Resolve target role from query or default to general software engineering profile.
  const targetRole = req.query.role || 'Software Engineer';

  try {
    // 1. Fetch user's current skills
    const userSkillsData = await db.select().from(userSkills).where(eq(userSkills.user_id, userId));
    
    // 2. Fetch baseline market requirements for target role
    const requiredSkills = [
      { name: 'React', importance: 90 },
      { name: 'TypeScript', importance: 85 },
      { name: 'Node.js', importance: 80 },
      { name: 'AWS', importance: 60 }
    ];

    // 3. Compare to find gaps
    const userSkillNames = userSkillsData.map(s => s.skill_id); // In reality we'd join with skills table
    const missingSkills = requiredSkills.filter(rs => !userSkillNames.includes(rs.name));

    // Calculate role readiness index
    const totalImportance = requiredSkills.reduce((acc, curr) => acc + curr.importance, 0);
    const userImportance = requiredSkills
      .filter(rs => userSkillNames.includes(rs.name))
      .reduce((acc, curr) => acc + curr.importance, 0);

    const readinessScore = Math.round((userImportance / totalImportance) * 100) || 0;

    res.json({
      targetRole,
      readinessScore,
      missingSkills
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
