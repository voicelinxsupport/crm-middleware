import { Router } from 'express';
import { parseBasicAuth, generateJwt } from '../middleware/auth';
import { getClient } from '../db/database';

const router = Router();

router.get('/token', async (req, res) => {
  const creds = parseBasicAuth(req);
  if (!creds) { res.status(401).json({ error: 'Basic Auth gerekli' }); return; }

  const client = await getClient(creds.clientId);
  if (!client || client.secret !== creds.secret) {
    res.status(401).json({ error: 'Geçersiz client_id veya api_key' }); return;
  }

  res.json({ token: generateJwt(creds.clientId) });
});

export default router;
