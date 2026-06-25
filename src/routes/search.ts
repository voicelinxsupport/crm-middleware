import { Router } from 'express';
import { requireJwt, requireUserId } from '../middleware/auth';
import { searchByPhone, searchByEmail, searchByText } from '../services/salesforce';

const router = Router();

router.get('/search', requireJwt, requireUserId, async (req, res) => {
  const clientId = res.locals.clientId as string;
  const userId = res.locals.userId as string;

  const q = req.query['q'] as string;
  const searchBy = req.query['search_by'] as string | undefined;
  const limit = parseInt(req.query['limit'] as string) || 20;

  let objectTypes = req.query['object_types'];
  const types: string[] = Array.isArray(objectTypes)
    ? objectTypes as string[]
    : objectTypes ? [objectTypes as string] : [];

  if (!q) { res.status(400).json({ error: 'q parametresi gerekli' }); return; }

  try {
    let results: any[];
    if (searchBy === 'phone' || (!searchBy && q.match(/^[\d\+\-\(\)\s]+$/))) {
      results = await searchByPhone(clientId, userId, q, types);
    } else if (searchBy === 'email' || q.includes('@')) {
      results = await searchByEmail(clientId, userId, q, types);
    } else {
      results = await searchByText(clientId, userId, q, types);
    }
    res.json(results.slice(0, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/associations', requireJwt, requireUserId, async (req, res) => {
  const clientId = res.locals.clientId as string;
  const userId = res.locals.userId as string;
  const q = req.query['q'] as string;
  const objectType = req.query['object_type'] as string;

  if (!q || !objectType) {
    res.status(400).json({ error: 'q ve object_type gerekli' }); return;
  }

  try {
    const results = await searchByText(clientId, userId, q, [objectType]);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
