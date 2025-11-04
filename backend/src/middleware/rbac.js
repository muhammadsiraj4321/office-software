export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export function requireNotRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Time-based edit/delete permissions
// Returns true if user with given role can edit/delete a record with ownerId at createdTs
export function canEditOrDelete(role, userId, ownerId, createdTs, now = Date.now()){
  const ageMs = Math.max(0, now - (createdTs || 0));
  const oneHour = 60 * 60 * 1000;
  const twentyFourHours = 24 * oneHour;
  switch(role){
    case 'ADMIN':
      return true;
    case 'GM':
      // Can edit any, but cannot delete others' data (delete check should gate separately)
      return true;
    case 'MANAGER':
    case 'ACCOUNTANT':
      // Can edit only their own within 24 hours
      return (userId === ownerId) && ageMs <= twentyFourHours;
    case 'EMPLOYEE':
      // Can edit only their own within 1 hour
      return (userId === ownerId) && ageMs <= oneHour;
    default:
      return false;
  }
}
