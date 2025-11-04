import { Router } from 'express';
import { db, ensureId, logActivity, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyRole, canEditOrDelete } from '../middleware/rbac.js';
import { saveDB } from '../data/persist.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.json(db.expenses.filter(e => e.userId === req.user.id));
  }
  res.json(db.expenses);
});

router.post('/', requireAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]), (req, res) => {
  const { projectId, amount, note, description, expenseDate } = req.body || {};
  if (!projectId || amount === undefined) return res.status(400).json({ error: 'Missing fields' });
  const createdBy = req.user?.name || req.user?.email || 'Unknown';
  const tsFromDate = expenseDate ? Date.parse(expenseDate) : undefined;
  const exp = {
    id: ensureId(),
    projectId,
    amount: Number(amount) || 0,
    description: (description ?? note ?? ''),
    expenseDate: expenseDate || null,
    createdBy,
    userId: req.user.id,
    ts: tsFromDate && !Number.isNaN(tsFromDate) ? tsFromDate : Date.now()
  };
  db.expenses.push(exp);
  logActivity(req.user.id, 'expense_create', { id: exp.id });
  saveDB(db);
  res.status(201).json(exp);
});

router.patch('/:id', requireAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.GM, ROLES.EMPLOYEE]), (req, res) => {
  const { id } = req.params;
  const e = db.expenses.find(x => x.id === id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const role = req.user.role;
  if (role !== ROLES.ADMIN && role !== ROLES.GM) {
    const allowed = canEditOrDelete(role, req.user.id, e.userId, e.ts);
    if (!allowed) return res.status(403).json({ error: 'Edit window expired or not owner' });
  }
  const { amount, projectId, description, note, expenseDate } = req.body || {};
  if (projectId !== undefined) e.projectId = projectId;
  if (amount !== undefined) e.amount = Number(amount) || 0;
  if (description !== undefined || note !== undefined) e.description = (description ?? note ?? e.description ?? '');
  if (expenseDate !== undefined) {
    e.expenseDate = expenseDate;
    const t = expenseDate ? Date.parse(expenseDate) : NaN;
    if (!Number.isNaN(t)) e.ts = t;
  }
  logActivity(req.user.id, 'expense_update', { id });
  saveDB(db);
  res.json(e);
});

router.delete('/:id', requireAnyRole([ROLES.ADMIN, ROLES.GM, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.EMPLOYEE]), (req, res) => {
  const { id } = req.params;
  const idx = db.expenses.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const item = db.expenses[idx];
  if (req.user.role === ROLES.GM && item.userId !== req.user.id) {
    return res.status(403).json({ error: 'GM cannot delete others\' data' });
  }
  if ((req.user.role === ROLES.MANAGER || req.user.role === ROLES.ACCOUNTANT || req.user.role === ROLES.EMPLOYEE) && !canEditOrDelete(req.user.role, req.user.id, item.userId, item.ts)) {
    return res.status(403).json({ error: 'Delete window expired or not owner' });
  }
  db.expenses.splice(idx, 1);
  logActivity(req.user.id, 'expense_delete', { id });
  saveDB(db);
  res.json({ ok: true });
});

export default router;
