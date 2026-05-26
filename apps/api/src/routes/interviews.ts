import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, interviews } from '@career-copilot/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');

router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { type, targetRole } = req.body;

  try {
    const [interview] = await db.insert(interviews).values({
      user_id: userId,
      type: type || 'behavioral',
      questions: [],
      answers: [],
    }).returning();

    // Start with the first question
    const history: any[] = [];
    const response = await fetch('http://localhost:8000/interview/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        interview_type: type || 'behavioral', 
        target_role: targetRole || 'Software Engineer',
        answer: "Hello, I am ready to start.",
        history
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }

    const aiData = await response.json();
    
    // Update DB with the first question
    await db.update(interviews).set({
      questions: [aiData.next_question]
    }).where(eq(interviews.id, interview.id));

    res.json({ interviewId: interview.id, nextQuestion: aiData.next_question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/answer', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { answer, targetRole } = req.body;
  const interviewId = req.params.id;

  try {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, interviewId));
    if (!interview) return res.status(404).json({ error: 'Not found' });

    // Mock history builder
    const history: any[] = [];
    
    const response = await fetch('http://localhost:8000/interview/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        interview_type: interview.type, 
        target_role: targetRole || 'Software Engineer',
        answer: answer,
        history
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }

    const aiData = await response.json();

    res.json(aiData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
