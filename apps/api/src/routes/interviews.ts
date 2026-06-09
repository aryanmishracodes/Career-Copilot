import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, interviews } from '@career-copilot/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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
    const response = await fetch(`${AI_SERVICE_URL}/interview/answer`, {
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

    // Build history from db arrays
    const history: any[] = [];
    history.push({ role: 'user', content: 'Hello, I am ready to start.' });
    
    const dbQuestions = (interview.questions || []) as string[];
    const dbAnswers = (interview.answers || []) as string[];
    
    for (let i = 0; i < dbAnswers.length; i++) {
      history.push({ role: 'assistant', content: dbQuestions[i] });
      history.push({ role: 'user', content: dbAnswers[i] });
    }
    
    if (dbQuestions.length > dbAnswers.length) {
      history.push({ role: 'assistant', content: dbQuestions[dbQuestions.length - 1] });
    }
    
    const response = await fetch(`${AI_SERVICE_URL}/interview/answer`, {
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

    // Update database with this answer and the next question
    const updatedQuestions = [...dbQuestions];
    if (aiData.next_question) {
      updatedQuestions.push(aiData.next_question);
    }
    const updatedAnswers = [...dbAnswers, answer];

    await db.update(interviews).set({
      questions: updatedQuestions,
      answers: updatedAnswers,
      overall_pct: typeof aiData.overall_pct === 'number' ? aiData.overall_pct : null,
      scores: aiData.scores || null
    }).where(eq(interviews.id, interviewId));

    res.json(aiData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

