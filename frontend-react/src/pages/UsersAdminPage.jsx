import React, { useEffect, useState } from 'react'
import useAuth from '../store/auth'
import { UsersAPI } from '../api'

export default function UsersAdminPage(){
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [err, setErr] = useState('')

  async function refresh(){
    if(!token){ setErr('Not authenticated. Please login again.'); return }
    try{
      setErr('')
      const [u, p] = await Promise.all([
        UsersAPI.list(token),
        UsersAPI.listPending(token)
      ])
      setUsers(u||[])
      setPending(p||[])
    }catch(e){ setErr(e.message||'Failed to load') }
  }
  useEffect(()=>{ if(token) refresh() },[token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button className="btn btn-outline" onClick={refresh} disabled={!token} title={!token? 'Please login again' : ''}>Refresh</button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="card">
        <h2 className="font-semibold mb-2">Pending Requests</h2>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Requested Role</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.length===0 && <tr><td colSpan={4} className="text-sm text-slate-500">No pending requests</td></tr>}
            {pending.map(r=> (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td>{r.requestedRole}</td>
                <td className="text-right">
                  <button className="btn btn-outline mr-2" onClick={async()=>{ await UsersAPI.approve(token, r.id); await refresh() }}>Approve</button>
                  <button className="btn btn-outline" onClick={async()=>{ await UsersAPI.reject(token, r.id); await refresh() }}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">All Users</h2>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Approved</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u=> (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select className="input" value={u.role} onChange={async(e)=>{ await UsersAPI.update(token, u.id, { role: e.target.value }); await refresh() }}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="GM">GM</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>
                </td>
                <td>
                  <input type="checkbox" checked={!!u.approved} onChange={async(e)=>{ await UsersAPI.update(token, u.id, { approved: e.target.checked }); await refresh() }} />
                </td>
                <td>
                  <input type="checkbox" checked={!!u.active} onChange={async(e)=>{ await UsersAPI.update(token, u.id, { active: e.target.checked }); await refresh() }} />
                </td>
                <td className="text-right">
                  <button className="btn btn-outline mr-2" onClick={async()=>{ const pw = prompt('New password for '+u.email+':'); if(pw){ await UsersAPI.update(token, u.id, { password: pw }); alert('Password reset'); } }}>Reset Password</button>
                  <button className="btn btn-outline" onClick={async()=>{ if(confirm('Delete user '+u.email+'?')){ await UsersAPI.remove(token, u.id); await refresh() } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
