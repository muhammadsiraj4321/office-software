import React, { useEffect, useMemo, useRef, useState } from 'react'
import useAuth from '../store/auth'
import { MaterialsAPI, ProjectsAPI } from '../api'
import Modal from '../components/Modal'
import * as XLSX from 'xlsx'

export default function MaterialDeliveryPage(){
  const { token, user } = useAuth()
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [previewRows, setPreviewRows] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ if(token){ ProjectsAPI.list(token).then(setProjects) } },[token])
  const reqGuard = useRef(0)
  useEffect(()=>{
    // Auto-refresh on project change. Clear previous state immediately to avoid mixups
    setItems([])
    setErr('')
    setEditing(null)
    setPreviewRows([])
    setShowPreview(false)
    // reset filters for the new project
    setFrom('')
    setTo('')
    if(!(token && projectId)) return
    const guard = ++reqGuard.current
    setLoading(true)
    MaterialsAPI.list(token, projectId)
      .then(list=>{ if(guard===reqGuard.current) setItems(list) })
      .catch(e=>{ if(guard===reqGuard.current) setErr(e.message||'Failed to load materials') })
      .finally(()=>{ if(guard===reqGuard.current) setLoading(false) })
  },[token, projectId])

  const filtered = useMemo(()=>{
    let list = items.slice()
    if(from){ const t=Date.parse(from); if(!Number.isNaN(t)) list = list.filter(x=> (x.ts||0) >= t) }
    if(to){ const t=Date.parse(to); if(!Number.isNaN(t)) list = list.filter(x=> (x.ts||0) <= t+24*60*60*1000-1) }
    return list
  },[items, from, to])

  const total = useMemo(()=> filtered.reduce((s,x)=> s + (Number(x.total)||0), 0),[filtered])
  const vat = useMemo(()=> total * 0.05, [total])
  const grandTotal = useMemo(()=> total + vat, [total, vat])
  const fmtCurrency = (n) => (Number(n)||0).toLocaleString(undefined,{style:'currency',currency:'AED'})
  const fmtDate = (d) => new Date(d).toLocaleDateString()

  function exportCSV(){
    const header = ['Invoice Date','Supplier','Material Name','Quantity','Unit Price','Total']
    const rows = filtered.map(m=> [m.invoiceDate||'', m.supplier||'', m.materialName||'', m.quantity||0, m.unitPrice||0, m.total||0])
    const csv = [header, ...rows].map(r=> r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`materials_${projectId||'all'}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  function normalizeKey(s){
    if(s==null) return ''
    return String(s)
      .toLowerCase()
      .replace(/\u00a0/g,' ')
      .replace(/[()]/g,'')
      .replace(/\s*\/\s*/g,'/')
      .replace(/\s+/g,' ')
      .trim()
  }

  function findIdx(header, aliases){
    const norms = header.map(normalizeKey)
    for(const a of aliases){
      const idx = norms.indexOf(normalizeKey(a))
      if(idx!==-1) return idx
    }
    return -1
  }

  function scoreCsvColumns(header, rows){
    const norms = header.map(normalizeKey)
    const colCount = norms.length
    const sample = rows.slice(0, Math.min(rows.length, 50))
    const scores = Array.from({length: colCount}, ()=>({date:0, qty:0, price:0, text:0}))
    for(const r of sample){
      for(let i=0;i<colCount;i++){
        const v = r[i]
        const n = parseNum(v)
        const date = normalizeDate(v)
        if(date) scores[i].date++
        if(n>0) scores[i].qty++
        if(n>=0 && String(v).toLowerCase().includes('aed')) scores[i].price+=2
        if(v && String(v).trim() && !Number.isFinite(+v)) scores[i].text++
      }
    }
    const pickMax = (key, exclude=[])=>{
      let best=-1, idx=-1
      for(let i=0;i<colCount;i++){
        if(exclude.includes(i)) continue
        const val = scores[i][key]
        if(val>best){ best=val; idx=i }
      }
      return idx
    }
    const dateIdx = pickMax('date')
    const qtyIdx = pickMax('qty', [dateIdx])
    const priceIdx = pickMax('price', [dateIdx, qtyIdx])
    // pick two text columns for supplier/material
    const supplierIdx = pickMax('text', [dateIdx, qtyIdx, priceIdx])
    const materialIdx = pickMax('text', [dateIdx, qtyIdx, priceIdx, supplierIdx])
    return { dateIdx, supplierIdx, materialIdx, qtyIdx, priceIdx }
  }

function ConfirmUploadModal({ rows, onClose, onConfirm }){
  const [data, setData] = useState(rows || [])
  const issues = (r)=>{
    const errs = []
    if(!r.invoiceDate) errs.push('Date')
    if(!r.supplier) errs.push('Supplier')
    if(!r.materialName) errs.push('Material')
    if(!(Number(r.quantity)>0)) errs.push('Qty')
    if(!(Number(r.unitPrice)>=0)) errs.push('Price')
    return errs
  }
  const invalid = data.some(r=> issues(r).length>0)
  const total = data.reduce((s,r)=> s + (Number(r.quantity)||0)*(Number(r.unitPrice)||0), 0)

  return (
    <Modal open={true} onClose={onClose} title="Confirm Upload">
      <div className="space-y-3">
        <div className="text-sm text-slate-600">Review parsed data. Fix any highlighted issues before confirming.</div>
        <div className="card overflow-auto max-h-[50vh]">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Material</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i)=>{
                const e = issues(r)
                const total = (Number(r.quantity)||0)*(Number(r.unitPrice)||0)
                return (
                  <tr key={i} className={e.length? 'bg-red-50' : ''}>
                    <td>{r.invoiceDate||''}</td>
                    <td>{r.supplier||''}</td>
                    <td>{r.materialName||''}</td>
                    <td className="text-right">{r.quantity||0}</td>
                    <td className="text-right">{r.unitPrice||0}</td>
                    <td className="text-right">{total||0}</td>
                    <td>{e.length? <span className="text-red-600 text-xs">{e.join(', ')}</span> : <span className="text-green-600 text-xs">OK</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>Total rows: {data.length} • Total amount: {total.toLocaleString(undefined,{style:'currency',currency:'AED'})}</div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={invalid} onClick={()=> onConfirm?.(data)}>Confirm Upload</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

  function printTable(){
    const w = window.open('','_blank')
    const rows = filtered.map(m=> `<tr><td>${m.invoiceDate||''}</td><td>${m.supplier||''}</td><td>${m.materialName||''}</td><td style="text-align:right">${m.quantity||0}</td><td style="text-align:right">${m.unitPrice||0}</td><td style="text-align:right">${m.total||0}</td></tr>`).join('')
    w.document.write(`<html><head><title>Materials</title></head><body><table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Invoice Date</th><th>Supplier</th><th>Material</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    w.document.close(); w.focus(); w.print(); w.close()
  }

  function normalizeDate(v){
    if(v===undefined||v===null||v==='') return ''
    if(typeof v==='number'){
      const ms = Math.round((v - 25569) * 86400 * 1000)
      const d = new Date(ms)
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
    }
    const s = String(v).trim()
    // dd/mm/yyyy -> yyyy-mm-dd
    const m = s.match(/^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\s*$/)
    if(m){
      const [ , d, mth, y ] = m
      const iso = `${y}-${String(mth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dt = new Date(iso)
      return isNaN(dt.getTime()) ? '' : iso
    }
    const dt = new Date(s)
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0,10)
  }

  function parseNum(n){
    if(n===undefined||n===null||n==='') return 0
    if(typeof n==='number') return n
    return Number(String(n).replace(/AED/gi,'').replaceAll(',','').trim())||0
  }

  async function parseCsv(file){
    const text = await file.text()
    const rows = text.split(/\r?\n/).filter(Boolean).map(r=> r.split(',').map(c=> c.replace(/^(\"|\')|((\"|\')$)/g,'')))
    // Expect header: Invoice Date,Supplier,Material Name,Quantity,Unit Price
    const header = (rows.shift()||[])
    let idx = {
      date: findIdx(header, ['invoice date','date','invoice']),
      supplier: findIdx(header, ['supplier','supplier/vendor','supplier / vendor','vendor']),
      material: findIdx(header, ['material name','material','item']),
      qty: findIdx(header, ['quantity','qty','quantity (pcs)','qty (pcs)']),
      price: findIdx(header, ['unit price','unit price aed','unit price (aed)','price','rate']),
    }
    if(idx.date===-1 || idx.supplier===-1 || idx.material===-1 || idx.qty===-1 || idx.price===-1){
      const s = scoreCsvColumns(header, rows)
      if(idx.date===-1) idx.date = s.dateIdx
      if(idx.qty===-1) idx.qty = s.qtyIdx
      if(idx.price===-1) idx.price = s.priceIdx
      if(idx.supplier===-1) idx.supplier = s.supplierIdx
      if(idx.material===-1) idx.material = s.materialIdx
    }
    const out = []
    for(const r of rows){
      if(!r.length) continue
      out.push({
        invoiceDate: idx.date>-1 ? normalizeDate(r[idx.date]) : '',
        supplier: idx.supplier>-1 ? r[idx.supplier]||'' : '',
        materialName: idx.material>-1 ? r[idx.material]||'' : '',
        quantity: idx.qty>-1 ? parseNum(r[idx.qty]) : 0,
        unitPrice: idx.price>-1 ? parseNum(r[idx.price]) : 0,
      })
    }
    return out
  }

  async function onUpload(e){
    const file = e.target.files?.[0]
    if(!file || !projectId) return
    setErr('')
    // Try xlsx first
    if(/\.xlsx$/i.test(file.name)){
      try{
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data, { type:'array' })
        // pick best sheet by header match score
        let bestSheet=''
        let bestScore=-1
        for(const name of wb.SheetNames){
          const ws = wb.Sheets[name]
          const grid = XLSX.utils.sheet_to_json(ws, { header:1 })
          const headerRow = (grid.find(r=> Array.isArray(r) && r.some(c=> String(c||'').trim()))||[])
          if(!headerRow.length) continue
          const aliases = {
            date:['invoice date','date','invoice'],
            supplier:['supplier','supplier/vendor','supplier / vendor','vendor'],
            material:['material name','material','item'],
            qty:['quantity','qty','quantity pcs','qty (pcs)'],
            price:['unit price','unit price aed','unit price (aed)','price','rate']
          }
          let found = 0
          for(const a of Object.values(aliases)){
            if(findIdx(headerRow, a)!==-1) found++
          }
          if(found>bestScore){ bestScore=found; bestSheet=name }
        }
        const ws = wb.Sheets[bestSheet||wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false })
        const normalizedRows = json.map(row=>{
          const n={}; for(const [k,v] of Object.entries(row)) n[normalizeKey(k)] = v; return n
        })
        // derive keys from first row
        const keys = Object.keys(normalizedRows[0]||{})
        const keyIdx = (aliases)=>{
          for(const a of aliases){ if(keys.includes(normalizeKey(a))) return normalizeKey(a) }
          return ''
        }
        let keyMap = {
          date: keyIdx(['invoice date','date','invoice']),
          supplier: keyIdx(['supplier','supplier/vendor','vendor']),
          material: keyIdx(['material name','material','item']),
          qty: keyIdx(['quantity','qty','quantity pcs','qty pcs']),
          price: keyIdx(['unit price','unit price aed','price','rate'])
        }
        // heuristic fallback if missing
        const scoreKey = (key)=>{
          const vals = normalizedRows.slice(0,50).map(r=> r[key])
          const dateScore = vals.filter(v=> !!normalizeDate(v)).length
          const numScore = vals.filter(v=> parseNum(v)>0).length
          const textScore = vals.filter(v=> v && !Number.isFinite(+v)).length
          return { dateScore, numScore, textScore }
        }
        const pickKey = (exclude, metric)=>{
          let bestKey='', bestVal=-1
          for(const k of keys){ if(exclude.includes(k)) continue; const s=scoreKey(k); const v=s[metric]; if(v>bestVal){bestVal=v; bestKey=k} }
          return bestKey
        }
        const used=[]
        if(!keyMap.date){ keyMap.date = pickKey(used, 'dateScore'); if(keyMap.date) used.push(keyMap.date) }
        if(!keyMap.qty){ keyMap.qty = pickKey(used, 'numScore'); if(keyMap.qty) used.push(keyMap.qty) }
        if(!keyMap.price){ keyMap.price = pickKey(used, 'numScore'); if(keyMap.price) used.push(keyMap.price) }
        if(!keyMap.supplier){ keyMap.supplier = pickKey(used, 'textScore'); if(keyMap.supplier) used.push(keyMap.supplier) }
        if(!keyMap.material){ keyMap.material = pickKey(used, 'textScore'); if(keyMap.material) used.push(keyMap.material) }

        const out = normalizedRows.map(nr=>({
          invoiceDate: normalizeDate(nr[keyMap.date]||''),
          supplier: nr[keyMap.supplier]||'',
          materialName: nr[keyMap.material]||'',
          quantity: parseNum(nr[keyMap.qty]),
          unitPrice: parseNum(nr[keyMap.price])
        }))
        if(!out.length){ setErr('No rows parsed from .xlsx. Make sure the sheet has column headers: Invoice Date, Supplier, Material Name, Quantity, Unit Price'); return }
        setPreviewRows(out)
        setShowPreview(true)
        return
      }catch(err){
        console.warn('xlsx parse failed, falling back to CSV', err)
        setErr('Could not parse .xlsx file. Ensure header row exists with: Invoice Date, Supplier, Material Name, Quantity, Unit Price. You can also upload .csv')
      }
    }
    // Fallback CSV
    const parsed = await parseCsv(file)
    if(!parsed.length){ setErr('No rows parsed from CSV. Please ensure headers include at least: Invoice Date, Supplier, Material Name, Quantity, Unit Price'); return }
    setPreviewRows(parsed)
    setShowPreview(true)
    // reset input so same file can be selected again
    try{ if(fileRef.current) fileRef.current.value = '' }catch{}
  }

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Material Delivery</h1>
            <div className="flex items-center gap-2">
              <label className={`btn cursor-pointer ${loading?'btn-disabled pointer-events-none opacity-60':''}`}>
                Upload Excel/CSV
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={onUpload} disabled={loading} />
              </label>
              <button className="btn btn-outline" onClick={exportCSV} disabled={loading || !filtered.length}>Export CSV</button>
              <button className="btn btn-outline" onClick={printTable} disabled={loading || !filtered.length}>Print</button>
              {user?.role==='ADMIN' && (
                <button className="btn btn-outline !border-orange-600 !text-orange-600" disabled={loading || !projectId} onClick={async()=>{
                  if(!projectId) return
                  if(confirm('Delete all materials for the selected project only?')){
                    try{
                      await fetch((window.API_BASE||'') + `/materials?projectId=${encodeURIComponent(projectId)}`, { method:'DELETE', headers:{ 'Authorization': 'Bearer '+token } })
                      setItems([])
                      setErr('Project materials purged successfully')
                    }catch(e){ setErr(e.message||'Project purge failed') }
                  }
                }}>Purge This Project</button>
              )}
            </div>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
              Loading
            </div>
          )}

      <div className="card grid md:grid-cols-4 gap-3 items-end">
        <div>
          <div className="label">Project</div>
          <select className="input" value={projectId} onChange={e=>setProjectId(e.target.value)} disabled={loading}>
            <option value="">Select project</option>
            {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div className="label">From</div>
          <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <div className="label">To</div>
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div className="ml-auto text-sm text-slate-600 text-right space-y-0.5">
          <div>Total: <span className="font-semibold">{fmtCurrency(total)}</span></div>
          <div>VAT (5%): <span className="font-semibold">{fmtCurrency(vat)}</span></div>
          <div className="border-t pt-1">Grand Total: <span className="font-semibold">{fmtCurrency(grandTotal)}</span></div>
        </div>
      </div>

      <div className={`card overflow-auto ${loading?'opacity-60 pointer-events-none':''}`}>
        <table className="table min-w-[1000px]">
          <thead>
            <tr>
              <th>Invoice Date</th>
              <th>Supplier / Vendor</th>
              <th>Material Name</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m=> (
              <tr key={m.id}>
                <td>{m.invoiceDate ? fmtDate(m.invoiceDate) : fmtDate(m.ts)}</td>
                <td>{m.supplier}</td>
                <td>{m.materialName}</td>
                <td className="text-right">{m.quantity}</td>
                <td className="text-right">{fmtCurrency(m.unitPrice)}</td>
                <td className="text-right">{fmtCurrency(m.total)}</td>
                <td className="text-right">
                  <button className="btn btn-outline mr-2" onClick={()=>!loading && setEditing(m)} disabled={loading}>Edit</button>
                  <button className="btn btn-outline" disabled={loading} onClick={async()=>{
                    if(!projectId){ setErr('Select a project first'); return }
                    if(confirm('Delete material?')){
                      try{
                        await MaterialsAPI.remove(token, projectId, m.id)
                        // Optimistic update
                        setItems(prev=> prev.filter(x=>x.id!==m.id))
                      }catch(e){ setErr(e.message||'Delete failed') }
                    }
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal item={editing} onClose={()=>setEditing(null)} onSaved={async(updated)=>{
          if(!projectId){ setErr('Select a project first'); return }
          try{
            await MaterialsAPI.update(token, projectId, editing.id, updated)
            setItems(await MaterialsAPI.list(token, projectId))
          }catch(e){ setErr(e.message||'Update failed') }
          setEditing(null)
        }} />
      )}
      {showPreview && (
        <ConfirmUploadModal
          rows={previewRows}
          onClose={()=>{ setShowPreview(false); setPreviewRows([]) }}
          onConfirm={async(validRows)=>{
            try{
              await MaterialsAPI.bulk(token, projectId, validRows)
              setItems(await MaterialsAPI.list(token, projectId))
              setShowPreview(false); setPreviewRows([])
            }catch(e){ setErr(e.message||'Upload failed') }
          }}
        />
      )}
    </div>
  )
}

function EditModal({ item, onClose, onSaved }){
  const [form, setForm] = useState({ ...item })
  function submit(e){ e.preventDefault(); onSaved?.({ invoiceDate: form.invoiceDate, supplier: form.supplier, materialName: form.materialName, quantity: +form.quantity, unitPrice: +form.unitPrice }) }
  if(!item) return null
  return (
    <Modal open={!!item} onClose={onClose} title="Edit Material">
      <form onSubmit={submit} className="space-y-3">
        <div><div className="label">Invoice Date</div><input className="input" type="date" value={form.invoiceDate||''} onChange={e=>setForm({...form, invoiceDate:e.target.value})}/></div>
        <div><div className="label">Supplier</div><input className="input" value={form.supplier||''} onChange={e=>setForm({...form, supplier:e.target.value})}/></div>
        <div><div className="label">Material Name</div><input className="input" value={form.materialName||''} onChange={e=>setForm({...form, materialName:e.target.value})}/></div>
        <div><div className="label">Quantity</div><input className="input" type="number" step="0.01" value={form.quantity||0} onChange={e=>setForm({...form, quantity:e.target.value})}/></div>
        <div><div className="label">Unit Price</div><input className="input" type="number" step="0.01" value={form.unitPrice||0} onChange={e=>setForm({...form, unitPrice:e.target.value})}/></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn" type="submit">Save</button></div>
      </form>
    </Modal>
  )
}
