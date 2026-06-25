import 'dotenv/config';
import express from 'express';
import { initDb } from './db/database';
import tokenRouter from './routes/token';
import configRouter from './routes/config';
import authRouter from './routes/auth';
import searchRouter from './routes/search';
import objectRouter from './routes/objects';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = '/salesforce/user';

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(BASE + '/api/v1', tokenRouter);
app.use(BASE + '/api/v1', configRouter);
app.use(BASE, authRouter);
app.use(BASE + '/api/v1', authRouter);
app.use(BASE + '/api/v1', searchRouter);
app.use(BASE + '/api/v1', objectRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

initDb().then(() => {
  app.listen(PORT, () => console.log(`CRM Middleware running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
