import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, findUserByEmail, ensureId, logActivity } from '../data/store.js';
import { signToken } from '../utils/jwt.js';
import { saveDB } from '../data/persist.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password || '', user.password || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.approved) return res.status(403).json({ error: 'Awaiting Admin Approval' });
  if (!user.active) return res.status(403).json({ error: 'Account disabled' });
  const token = signToken({ sub: user.id, role: user.role });
  logActivity(user.id, 'login', {});
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/request-account', (req, res) => {
  const { name, email, requestedRole, password } = req.body || {};
  if (!name || !email || !requestedRole) return res.status(400).json({ error: 'Missing fields' });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'Email already exists' });
  const existingReq = db.accountRequests.find(r => r.email.toLowerCase() === email.toLowerCase());
  if (existingReq) {
    existingReq.name = name;
    existingReq.requestedRole = requestedRole;
    existingReq.ts = Date.now();
    existingReq.status = 'PENDING';
    existingReq.passwordHash = password ? bcrypt.hashSync(String(password), 10) : existingReq.passwordHash;
    saveDB(db);
    logActivity(null, 'account_request_submit', { requestId: existingReq.id, email });
    return res.json({ ok: true, id: existingReq.id });
  }
  const reqId = ensureId();
  const passwordHash = password ? bcrypt.hashSync(String(password), 10) : undefined;
  db.accountRequests.push({ id: reqId, name, email, requestedRole, ts: Date.now(), status: 'PENDING', passwordHash });
  saveDB(db);
  logActivity(null, 'account_request_submit', { requestId: reqId, email });
  res.json({ ok: true, id: reqId });
});

export default router;
