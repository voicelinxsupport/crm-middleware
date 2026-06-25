import { Router } from 'express';
import { requireJwt, requireUserId } from '../middleware/auth';
import { saveUserToken, getUserToken, deleteUserToken } from '../db/database';
import { buildLoginUrl, exchangeCodeForToken } from '../services/salesforce';

const router = Router();

router.get('/auth/login_url', requireJwt, requireUserId, (req, res) => {
  const clientId = res.locals.clientId as string;
  const userId = res.locals.userId as string;
  const redirectUri = req.query['redirect_uri'] as string;
  if (!redirectUri) { res.status(400).json({ error: 'redirect_uri gerekli' }); return; }

  const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri, client_id: clientId, user_id: userId })).toString('base64');
  res.json({ login_url: buildLoginUrl(state) });
});

router.get('/salesforce/user/callback/code', async (req, res) => {
  const { code, state } = req.query as { code: string; state: string };
  if (!code || !state) { res.status(400).send('code veya state eksik'); return; }

  let stateObj: { redirect_uri: string; client_id: string; user_id: string };
  try { stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf8')); }
  catch { res.status(400).send('Geçersiz state'); return; }

  const { redirect_uri, client_id, user_id } = stateObj;
  try {
    const tokenData = await exchangeCodeForToken(code);
    await saveUserToken({
      client_id, user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      instance_url: tokenData.instance_url,
      email: tokenData.email,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
    const url = new URL(redirect_uri);
    url.searchParams.set('success', 'true');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  } catch (err) {
    console.error('OAuth callback error:', err);
    const url = new URL(redirect_uri);
    url.searchParams.set('success', 'false');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  }
});

router.get('/auth/status', requireJwt, requireUserId, async (req, res) => {
  const token = await getUserToken(res.locals.clientId, res.locals.userId);
  res.json({ authorized: !!token, email: token?.email || '' });
});

router.get('/auth/logout', requireJwt, requireUserId, async (req, res) => {
  await deleteUserToken(res.locals.clientId, res.locals.userId);
  res.status(200).send();
});

export default router;
