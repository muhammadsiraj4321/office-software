import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { loadDB, saveDB } from './persist.js';

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  EMPLOYEE: 'EMPLOYEE',
  GM: 'GM'
};

const adminId = uuid();
const adminPassword = bcrypt.hashSync('admin123', 10);
const sirajId = uuid();
const sirajPassword = bcrypt.hashSync('siraj123', 10);
const defaults = {
  users: [
    { id: adminId, name: 'Admin', email: 'admin@company.com', role: ROLES.ADMIN, active: true, approved: true, password: adminPassword },
    { id: sirajId, name: 'Siraj', email: 'sirajaldhab@gmail.com', role: ROLES.ADMIN, active: true, approved: true, password: sirajPassword }
  ],
  accountRequests: [],
  projects: [],
  expenses: [],
  incomes: [],
  activity: [],
  documents: {}
};

export const db = loadDB(defaults);

export function logActivity(userId, action, meta = {}) {
  db.activity.push({ id: uuid(), userId, action, meta, ts: Date.now() });
  saveDB(db);
}

export function findUserByEmail(email) {
  return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

export function ensureId() {
  return uuid();
}

// Ensure main owner account exists even if db.json was created before defaults were updated
const ownerEmail = 'sirajaldhab@gmail.com';
if (!findUserByEmail(ownerEmail)) {
  const owner = { id: sirajId, name: 'Siraj', email: ownerEmail, role: ROLES.ADMIN, active: true, approved: true, password: sirajPassword };
  db.users.push(owner);
  saveDB(db);
}
