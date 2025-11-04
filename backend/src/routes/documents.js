import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db, logActivity, ROLES } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyRole } from '../middleware/rbac.js';
import { saveDB } from '../data/persist.js';
import { fileURLToPath } from 'url';

const router = Router();
router.use(requireAuth);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DOCS_DIR = path.resolve(DATA_DIR, 'docs');
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

const KEYS = ['companyProfile','tradeLicense','vatCertificate'];

function metaOnly(record){
  if (!record) return null;
  const { name, ts, size, mime } = record;
  return { name, ts, size, mime };
}

router.get('/', (req, res) => {
  const out = {};
  KEYS.forEach(k => { out[k] = metaOnly(db.documents?.[k] || null); });
  return res.json(out);
});

router.get('/:key', (req, res) => {
  const { key } = req.params;
  if (!KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  return res.json(metaOnly((db.documents||{})[key] || null));
});

router.get('/:key/download', (req, res) => {
  const { key } = req.params;
  if (!KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  const rec = (db.documents||{})[key];
  if (!rec || !rec.path || !fs.existsSync(rec.path)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', rec.mime || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${rec.name || key + '.pdf'}"`);
  fs.createReadStream(rec.path).pipe(res);
});

router.post('/:key', requireAnyRole([ROLES.ADMIN]), (req, res) => {
  const { key } = req.params;
  if (!KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  const { name, dataUrl } = req.body || {};
  if (!name || !dataUrl) return res.status(400).json({ error: 'Missing fields' });
  const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
  if (!match) return res.status(400).json({ error: 'Invalid dataUrl' });
  const mime = match[1];
  if (mime !== 'application/pdf') return res.status(400).json({ error: 'Only PDF allowed' });
  const b64 = match[2];
  const buf = Buffer.from(b64, 'base64');
  const filePath = path.join(DOCS_DIR, `${key}.pdf`);
  fs.writeFileSync(filePath, buf);
  if (!db.documents) db.documents = {};
  db.documents[key] = { name, ts: Date.now(), size: buf.length, mime, path: filePath };
  logActivity(req.user.id, 'document_upload', { key });
  saveDB(db);
  return res.status(201).json(metaOnly(db.documents[key]));
});

router.delete('/:key', requireAnyRole([ROLES.ADMIN]), (req, res) => {
  const { key } = req.params;
  if (!KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  const rec = (db.documents||{})[key];
  if (!rec) return res.status(404).json({ error: 'Not found' });
  try {
    if (rec.path && fs.existsSync(rec.path)) fs.unlinkSync(rec.path);
  } catch {}
  if (db.documents) delete db.documents[key];
  logActivity(req.user.id, 'document_remove', { key });
  saveDB(db);
  return res.json({ ok: true });
});

export default router;
