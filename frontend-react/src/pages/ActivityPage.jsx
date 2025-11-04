import React, { useEffect, useMemo, useState } from 'react'
import useAuth from '../store/auth'

export default function ActivityPage(){
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [err, setErr] = useState('')
  const [filters, setFilters] = useState({ userId:'', action:'', from:'', to:'' })
  const [detail, setDetail] = useState(null)

  useEffect(()=>{
    if(!token) return
    ;(async()=>{
      try{
        setErr('')
        const [actRes, usersRes] = await Promise.all([
          fetch((window.API_BASE||'') + '/activity', { headers: { 'Authorization':'Bearer '+token } }),
          fetch((window.API_BASE||'') + '/users', { headers: { 'Authorization':'Bearer '+token } })
        ])
        const [actData, usersData] = await Promise.all([actRes.json(), usersRes.json()])
        if(!actRes.ok) throw new Error(actData?.error || 'Failed to load activity')
        if(!usersRes.ok) throw new Error(usersData?.error || 'Failed to load users')
        setItems(actData||[])
        setUsers(usersData||[])
      }catch(e){ setErr(e.message||'Failed to load') }
    })()
  },[token])

  const usersById = useMemo(()=>Object.fromEntries(users.map(u=>[u.id,u])),[users])
  const filtered = useMemo(()=>{
    let list = items.slice()
    if(filters.userId) list = list.filter(x=>x.userId===filters.userId)
    if(filters.action) list = list.filter(x=> (x.action||'').toLowerCase().includes(filters.action.toLowerCase()))
    if(filters.from){ const t=Date.parse(filters.from); if(!Number.isNaN(t)) list = list.filter(x=>x.ts>=t) }
    if(filters.to){ const t=Date.parse(filters.to); if(!Number.isNaN(t)) list = list.filter(x=>x.ts<=t+24*60*60*1000-1) }
    return list
  },[items, filters])

  function sectionFromAction(action=''){
    const base = String(action).split('_')[0] || ''
    return base.charAt(0).toUpperCase()+base.slice(1)
  }

  function recordIdFromMeta(meta){
    if(!meta||typeof meta!=='object') return ''
    return meta.projectId||meta.incomeId||meta.expenseId||meta.userId||meta.requestId||meta.target||meta.id||''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity Log</h1>
        <div className="text-sm text-slate-600">Total: {filtered.length}</div>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="card grid md:grid-cols-4 gap-3">
        <div>
          <div className="label">User</div>
          <select className="input" value={filters.userId} onChange={e=>setFilters({...filters, userId:e.target.value})}>
            <option value="">All</option>
            {users.map(u=> <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div>
          <div className="label">Action</div>
          <input className="input" placeholder="e.g. project_create" value={filters.action} onChange={e=>setFilters({...filters, action:e.target.value})}/>
        </div>
        <div>
          <div className="label">From</div>
          <input className="input" type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})}/>
        </div>
        <div>
          <div className="label">To</div>
          <input className="input" type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})}/>
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="table min-w-[800px]">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Section</th>
              <th>Record ID</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice().reverse().map(a=> {
              const section = sectionFromAction(a.action)
              const recId = recordIdFromMeta(a.meta)
              return (
                <tr key={a.id} className="cursor-pointer hover:bg-slate-50" onClick={()=>setDetail(a)}>
                  <td>{new Date(a.ts).toLocaleString(undefined,{ year:'numeric', month:'2-digit', day:'2-digit', hour:'numeric', minute:'2-digit', hour12:true })}</td>
                  <td>{usersById[a.userId]?.name || a.userId}</td>
                  <td>{a.action}</td>
                  <td>{section}</td>
                  <td>{recId}</td>
                  <td className="text-xs text-slate-600 truncate max-w-[360px]">{JSON.stringify(a.meta)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="text-lg font-semibold">Activity Detail</div>
              <button className="btn btn-outline" onClick={()=>setDetail(null)}>Close</button>
            </div>
            <div className="modal-body space-y-2">
              <div><span className="label">Time</span><div>{new Date(detail.ts).toLocaleString(undefined,{ year:'numeric', month:'2-digit', day:'2-digit', hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true })}</div></div>
              <div><span className="label">User</span><div>{usersById[detail.userId]?.name || detail.userId}</div></div>
              <div><span className="label">Action</span><div>{detail.action}</div></div>
              <div><span className="label">Section</span><div>{sectionFromAction(detail.action)}</div></div>
              <div><span className="label">Record ID</span><div>{recordIdFromMeta(detail.meta)}</div></div>
              <div>
                <div className="label">Meta</div>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto">{JSON.stringify(detail.meta, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
