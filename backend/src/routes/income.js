import { Router } from 'express';
import { db, ensureId, logActivity, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyRole, canEditOrDelete } from '../middleware/rbac.js';
import { saveDB } from '../data/persist.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  if (req.user.role === ROLES.EMPLOYEE) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.incomes);
});

router.post('/', requireAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId, amount, note, description, invoiceNo, invoiceDate } = req.body || {};
  if (!projectId || amount === undefined) return res.status(400).json({ error: 'Missing fields' });
  const createdBy = req.user?.name || req.user?.email || 'Unknown';
  const tsFromDate = invoiceDate ? Date.parse(invoiceDate) : undefined;
  const inc = {
    id: ensureId(),
    projectId,
    amount: Number(amount) || 0,
    description: (description ?? note ?? ''),
    invoiceNo: invoiceNo || '',
    invoiceDate: invoiceDate || null,
    createdBy,
    userId: req.user.id,
    ts: tsFromDate && !Number.isNaN(tsFromDate) ? tsFromDate : Date.now()
  };
  db.incomes.push(inc);
  logActivity(req.user.id, 'income_create', { id: inc.id });
  saveDB(db);
  res.status(201).json(inc);
});

router.patch('/:id', requireAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { id } = req.params;
  const it = db.incomes.find(x => x.id === id);
  if (!it) return res.status(404).json({ error: 'Not found' });
  const role = req.user.role;
  if (role !== ROLES.ADMIN && role !== ROLES.GM) {
    const allowed = canEditOrDelete(role, req.user.id, it.userId, it.ts);
    if (!allowed) return res.status(403).json({ error: 'Edit window expired or not owner' });
  }
  const { amount, projectId, description, note, invoiceNo, invoiceDate } = req.body || {};
  if (projectId !== undefined) it.projectId = projectId;
  if (amount !== undefined) it.amount = Number(amount) || 0;
  if (description !== undefined || note !== undefined) it.description = (description ?? note ?? it.description ?? '');
  if (invoiceNo !== undefined) it.invoiceNo = invoiceNo;
  if (invoiceDate !== undefined) {
    it.invoiceDate = invoiceDate;
    const t = invoiceDate ? Date.parse(invoiceDate) : NaN;
    if (!Number.isNaN(t)) it.ts = t;
  }
  logActivity(req.user.id, 'income_update', { id });
  saveDB(db);
  return res.json(it);
});

router.delete('/:id', requireAnyRole([ROLES.ADMIN, ROLES.GM, ROLES.MANAGER, ROLES.ACCOUNTANT]), (req, res) => {
  const { id } = req.params;
  const idx = db.incomes.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const item = db.incomes[idx];
  if (req.user.role === ROLES.GM && item.userId !== req.user.id) {
    return res.status(403).json({ error: 'GM cannot delete others\' data' });
  }
  if ((req.user.role === ROLES.MANAGER || req.user.role === ROLES.ACCOUNTANT) && !canEditOrDelete(req.user.role, req.user.id, item.userId, item.ts)) {
    return res.status(403).json({ error: 'Delete window expired or not owner' });
  }
  db.incomes.splice(idx, 1);
  logActivity(req.user.id, 'income_delete', { id });
  saveDB(db);
  res.json({ ok: true });
});

export default router;
