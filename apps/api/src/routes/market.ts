import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Multi-skill job search — searches for jobs across all user skills
router.post('/jobs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { skills, location } = req.body;
    console.log(`[MARKET] Multi-skill search for: ${JSON.stringify(skills)}`);

    const response = await fetch('http://localhost:8000/market/jobs-for-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: skills || [], location: location || 'India' }),
      signal: AbortSignal.timeout(45000), // 45s timeout
    });

    console.log(`[MARKET] Python response: ${response.status}`);

    if (!response.ok) {
      console.warn('[MARKET] AI service returned non-ok, returning empty jobs');
      return res.json({ jobs: [], by_skill: {}, total: 0 });
    }

    const data = await response.json();
    console.log(`[MARKET] Found ${data.total} total jobs`);
    res.json(data);
  } catch (error) {
    // Python service is down or timed out — return empty gracefully
    console.warn('[MARKET] AI service unreachable, returning empty jobs:', (error as Error).message);
    res.json({ jobs: [], by_skill: {}, total: 0 });
  }
});

// Search with a custom query
router.post('/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { query, location } = req.body;
    console.log(`[MARKET] Custom search: "${query}"`);

    const response = await fetch('http://localhost:8000/market/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || '', location: location || 'India' }),
      signal: AbortSignal.timeout(45000), // 45s timeout
    });

    if (!response.ok) {
      return res.json({ jobs: [], total: 0 });
    }

    const data = await response.json();
    console.log(`[MARKET] Found ${data.total} jobs`);
    res.json(data);
  } catch (error) {
    console.warn('[MARKET] Search service unreachable:', (error as Error).message);
    res.json({ jobs: [], total: 0 });
  }
});

export default router;
