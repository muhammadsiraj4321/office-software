import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, ensureId, logActivity, findUserByEmail, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { saveDB } from '../data/persist.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/', (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, approved: u.approved })));
});

router.post('/', (req, res) => {
  const { name, email, role, active = true, approved = true, password = 'changeme' } = req.body || {};
  if (!name || !email || !role) return res.status(400).json({ error: 'Missing fields' });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'Email already exists' });
  const user = { id: ensureId(), name, email, role, active, approved, password: bcrypt.hashSync(password, 10) };
  db.users.push(user);
  logActivity(req.user.id, 'user_create', { target: user.id });
  saveDB(db);
  res.status(201).json({ id: user.id });
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { role, active, approved, password } = req.body || {};
  if (role) user.role = role;
  if (active !== undefined) user.active = !!active;
  if (approved !== undefined) user.approved = !!approved;
  if (password) user.password = bcrypt.hashSync(password, 10);
  logActivity(req.user.id, 'user_update', { target: user.id });
  saveDB(db);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.users.splice(idx, 1);
  logActivity(req.user.id, 'user_delete', { target: id });
  saveDB(db);
  res.json({ ok: true });
});

router.get('/requests/pending', (req, res) => {
  res.json(db.accountRequests.filter(r => r.status === 'PENDING'));
});

router.post('/requests/:id/approve', (req, res) => {
  const { id } = req.params;
  const r = db.accountRequests.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (findUserByEmail(r.email)) return res.status(409).json({ error: 'Email already exists' });
  r.status = 'APPROVED';
  const initialPasswordHash = r.passwordHash || bcrypt.hashSync('changeme', 10);
  const user = { id: ensureId(), name: r.name, email: r.email, role: r.requestedRole, active: true, approved: true, password: initialPasswordHash };
  db.users.push(user);
  logActivity(req.user.id, 'request_approve', { requestId: id, userId: user.id });
  saveDB(db);
  res.json({ ok: true, userId: user.id });
});

router.post('/requests/:id/reject', (req, res) => {
  const { id } = req.params;
  const r = db.accountRequests.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  r.status = 'REJECTED';
  logActivity(req.user.id, 'request_reject', { requestId: id });
  saveDB(db);
  res.json({ ok: true });
});

export default router;
