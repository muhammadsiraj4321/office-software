import { Router } from 'express';
import { db, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyRole } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, requireAnyRole([ROLES.ADMIN, ROLES.GM]));

router.get('/', (req, res) => {
  res.json(db.activity);
});

export default router;
