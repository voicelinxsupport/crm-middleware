import { Router } from 'express';
import { requireJwt } from '../middleware/auth';
import { isClientActive, activateClient } from '../db/database';

const router = Router();

function getIcon(): string {
  return 'UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoBAAEAAUAmJYgCdAEO/gHOAAA=';
}

router.get('/config', requireJwt, async (req, res) => {
  const clientId = res.locals.clientId as string;
  if (await isClientActive(clientId)) {
    res.status(403).json({ error: 'Bu client ID zaten aktif' }); return;
  }
  res.json({ name: 'Salesforce', image: getIcon(), auth_method: 'oauth2' });
});

router.get('/config/versions', requireJwt, async (req, res) => {
  await activateClient(res.locals.clientId);
  res.json(['60']);
});

router.get('/config/objects', requireJwt, (_req, res) => {
  res.json(['Account', 'Contact', 'Lead']);
});

router.post('/config/custom-fields', requireJwt, (req, res) => {
  console.log('Custom fields:', JSON.stringify(req.body));
  res.status(200).json({ status: 'ok' });
});

export default router;
