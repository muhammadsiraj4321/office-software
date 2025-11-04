import { Router } from 'express';
import { db, ensureId, logActivity, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyRole, requireNotRole, canEditOrDelete } from '../middleware/rbac.js';
import { saveDB } from '../data/persist.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.projects);
});

router.post('/', requireAnyRole([ROLES.ADMIN, ROLES.GM, ROLES.ACCOUNTANT]), (req, res) => {
  const { name, client, budget = 0, assignedUsers = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing fields' });
  const createdBy = req.user?.name || req.user?.email || 'Unknown';
  const proj = { id: ensureId(), name, client: client || '', budget: Number(budget) || 0, assignedUsers, status: 'ONGOING', userId: req.user.id, createdBy, ts: Date.now() };
  db.projects.push(proj);
  logActivity(req.user.id, 'project_create', { projectId: proj.id });
  saveDB(db);
  res.status(201).json(proj);
});

router.patch('/:id', requireAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { id } = req.params;
  const p = db.projects.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const role = req.user.role;
  // Admin and GM can edit; Manager/Accountant only if they are owner within 24h
  if (role !== ROLES.ADMIN && role !== ROLES.GM) {
    const allowed = canEditOrDelete(role, req.user.id, p.userId, p.ts);
    if (!allowed) return res.status(403).json({ error: 'Edit window expired or not owner' });
  }
  Object.assign(p, req.body || {});
  logActivity(req.user.id, 'project_update', { projectId: id });
  saveDB(db);
  res.json(p);
});

router.delete('/:id', requireAnyRole([ROLES.ADMIN, ROLES.GM]), (req, res) => {
  const { id } = req.params;
  const idx = db.projects.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const item = db.projects[idx];
  if (req.user.role !== ROLES.ADMIN && item.userId !== req.user.id) {
    return res.status(403).json({ error: 'Cannot delete others\' data' });
  }
  db.projects.splice(idx, 1);
  logActivity(req.user.id, 'project_delete', { projectId: id });
  saveDB(db);
  res.json({ ok: true });
});

export default router;
