import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../store/auth'

export default function LoginPage(){
  const nav = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    if(!form.email || !form.password){ setError('Email and password are required'); return }
    try{
      setSubmitting(true)
      const ok = await login(form.email, form.password)
      if(ok){ nav('/') }
      else setError('Invalid credentials')
    }catch(err){
      const msg = String(err.message||'')
      if (msg.includes('Awaiting Admin Approval') || msg.includes('403')) setError('Waiting for admin approval')
      else if (msg.includes('Invalid credentials') || msg.includes('401')) setError('Invalid credentials')
      else setError(err.message || 'Login failed')
    }
    finally{ setSubmitting(false) }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <div className="label">Email</div>
          <input className="input" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        </div>
        <div>
          <div className="label">Password</div>
          <input className="input" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center justify-between">
          <Link className="text-sm text-blue-600" to="/signup">Create an account</Link>
          <button className="btn" type="submit" disabled={submitting}>{submitting? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
