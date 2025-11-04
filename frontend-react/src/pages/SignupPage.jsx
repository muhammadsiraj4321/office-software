import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../store/auth'

export default function SignupPage(){
  const { requestAccount } = useAuth()
  const [form, setForm] = useState({ name:'', email:'', requestedRole:'EMPLOYEE', password:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e){
    e.preventDefault(); setError('')
    if(!form.name || !form.email){ setError('Name and Email are required'); return }
    if(!form.password || form.password.length < 6){ setError('Password must be at least 6 characters'); return }
    try{
      setSubmitting(true)
      await requestAccount(form.name, form.email, form.requestedRole, form.password)
      setDone(true)
    }catch(err){
      const msg = String(err.message||'').toLowerCase()
      if (msg.includes('email already exists')) setError('Already used this email')
      else if (msg.includes('already submitted')) { setDone(true); }
      else setError(err.message || 'Failed to submit request')
    }
    finally{ setSubmitting(false) }
  }

  if(done){
    return (
      <div className="max-w-md mx-auto card">
        <h1 className="text-xl font-semibold mb-4">Waiting for admin approval</h1>
        <p className="text-sm text-slate-600">Your account request has been sent for approval. You will be able to log in once an Admin approves it.</p>
        <Link className="btn mt-4 inline-block" to="/login">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <div className="label">Full Name</div>
          <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        </div>
        <div>
          <div className="label">Email</div>
          <input className="input" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        </div>
        <div>
          <div className="label">Password</div>
          <input className="input" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        </div>
        <div>
          <div className="label">Requested Role</div>
          <select className="input" value={form.requestedRole} onChange={e=>setForm({...form, requestedRole:e.target.value})}>
            <option value="EMPLOYEE">Employee</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="MANAGER">Manager</option>
            <option value="GM">General Manager</option>
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center justify-between">
          <Link className="text-sm text-blue-600" to="/login">Back to login</Link>
          <button className="btn" type="submit" disabled={submitting}>{submitting? 'Submitting...' : 'Submit Request'}</button>
        </div>
      </form>
    </div>
  )
}
