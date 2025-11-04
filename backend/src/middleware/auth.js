import { verifyToken } from '../utils/jwt.js';
import { db } from '../data/store.js';

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  let token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    const q = req.query?.token;
    if (q && typeof q === 'string') token = q;
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user || !user.active || !user.approved) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
