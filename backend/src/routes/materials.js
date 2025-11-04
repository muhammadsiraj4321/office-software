import { Router } from 'express'
import { db, ensureId, logActivity, ROLES } from '../data/store.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAnyRole } from '../middleware/rbac.js'
import { saveDB } from '../data/persist.js'

const router = Router()
router.use(requireAuth)

function validateItem(raw){
  const errors = []
  const invoiceDate = raw.invoiceDate
  const supplier = raw.supplier
  const materialName = raw.materialName
  const quantity = Number(raw.quantity)
  const unitPrice = Number(raw.unitPrice)
  if(!invoiceDate) errors.push('invoiceDate required')
  if(!supplier) errors.push('supplier required')
  if(!materialName) errors.push('materialName required')
  if(!Number.isFinite(quantity) || quantity<=0) errors.push('quantity must be > 0')
  if(!Number.isFinite(unitPrice) || unitPrice<0) errors.push('unitPrice must be >= 0')
  const t = Date.parse(invoiceDate||'')
  const ts = Number.isNaN(t)? null : t
  return { ok: errors.length===0, errors, ts, quantity, unitPrice }
}

// List materials for a project
router.get('/', requireAnyRole([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId } = req.query || {}
  if (!projectId) return res.status(400).json({ error: 'projectId required' })
  const list = (db.materials && db.materials[projectId]) || []
  res.json(list)
})

// Create single material entry
router.post('/:projectId', requireAnyRole([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId } = req.params
  const payload = req.body || {}
  if (!projectId) return res.status(400).json({ error: 'projectId required' })
  const v = validateItem(payload)
  if(!v.ok) return res.status(400).json({ error: 'Invalid item', issues: v.errors })
  const { invoiceDate, supplier, materialName } = payload
  const { quantity, unitPrice, ts } = v
  const item = {
    id: ensureId(),
    projectId,
    invoiceDate,
    supplier,
    materialName,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    userId: req.user.id,
    createdBy: req.user?.name || req.user?.email || 'Unknown',
    ts: ts ?? Date.now(),
  }
  if (!db.materials) db.materials = {}
  if (!db.materials[projectId]) db.materials[projectId] = []
  db.materials[projectId].push(item)
  logActivity(req.user.id, 'material_create', { projectId, id: item.id })
  saveDB(db)
  res.status(201).json(item)
})

// Bulk create items for a project
router.post('/:projectId/bulk', requireAnyRole([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId } = req.params
  const { items } = req.body || {}
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' })
  if (!db.materials) db.materials = {}
  if (!db.materials[projectId]) db.materials[projectId] = []
  // Validate all first
  const issues = []
  const prepared = items.map((raw, idx)=>{
    const v = validateItem(raw)
    if(!v.ok) issues.push({ index: idx, errors: v.errors })
    return { raw, v }
  })
  if(issues.length){ return res.status(400).json({ error: 'Validation failed', issues }) }
  // Persist after successful validation
  const out = []
  for (const { raw, v } of prepared){
    const item = {
      id: ensureId(),
      projectId,
      invoiceDate: raw.invoiceDate,
      supplier: raw.supplier,
      materialName: raw.materialName,
      quantity: v.quantity,
      unitPrice: v.unitPrice,
      total: v.quantity * v.unitPrice,
      userId: req.user.id,
      createdBy: req.user?.name || req.user?.email || 'Unknown',
      ts: v.ts ?? Date.now(),
    }
    db.materials[projectId].push(item)
    out.push(item)
  }
  logActivity(req.user.id, 'material_bulk_create', { projectId, count: out.length })
  saveDB(db)
  res.status(201).json(out)
})

// Update a material row
router.patch('/:projectId/:id', requireAnyRole([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId, id } = req.params
  const list = (db.materials && db.materials[projectId]) || []
  const item = list.find(x=>x.id===id)
  if(!item) return res.status(404).json({ error: 'Not found' })
  const { invoiceDate, supplier, materialName, quantity, unitPrice } = req.body || {}
  if(invoiceDate!==undefined){ item.invoiceDate = invoiceDate; const t=Date.parse(invoiceDate); if(!Number.isNaN(t)) item.ts=t }
  if(supplier!==undefined) item.supplier = supplier
  if(materialName!==undefined) item.materialName = materialName
  if(quantity!==undefined) item.quantity = Number(quantity)||0
  if(unitPrice!==undefined) item.unitPrice = Number(unitPrice)||0
  item.total = (Number(item.quantity)||0) * (Number(item.unitPrice)||0)
  logActivity(req.user.id, 'material_update', { projectId, id })
  saveDB(db)
  res.json({ ok: true })
})

// Delete a material row
router.delete('/:projectId/:id', requireAnyRole([ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.GM]), (req, res) => {
  const { projectId, id } = req.params
  const list = (db.materials && db.materials[projectId]) || []
  const idx = list.findIndex(x=>x.id===id)
  if(idx===-1) return res.status(404).json({ error: 'Not found' })
  list.splice(idx,1)
  logActivity(req.user.id, 'material_delete', { projectId, id })
  saveDB(db)
  res.json({ ok: true })
})

// Purge materials (Admin only). If projectId is provided, purge only that project; else purge all.
router.delete('/', requireAnyRole([ROLES.ADMIN]), (req, res) => {
  const { projectId } = req.query || {}
  if(!db.materials) db.materials = {}
  if(projectId){
    const existed = !!db.materials[projectId]
    db.materials[projectId] = []
    logActivity(req.user.id, 'materials_purge_project', { projectId, existed })
  }else{
    db.materials = {}
    logActivity(req.user.id, 'materials_purge_all', {})
  }
  saveDB(db)
  res.json({ ok: true })
})

export default router
