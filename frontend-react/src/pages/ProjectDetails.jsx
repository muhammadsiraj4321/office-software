import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useAuth from '../store/auth'
import { ProjectsAPI, IncomeAPI, ExpensesAPI, UsersAPI, MaterialsAPI } from '../api'

export default function ProjectDetails(){
  const { id } = useParams()
  const { token, user } = useAuth()
  const [project, setProject] = useState(null)
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [users, setUsers] = useState([])
  const [materials, setMaterials] = useState([])

  useEffect(()=>{ if(token){
    ProjectsAPI.list(token).then(list=> setProject(list.find(p=>p.id===id)||null))
    IncomeAPI.list(token).then(setIncome)
    ExpensesAPI.list(token).then(setExpenses)
    if (user?.role==='ADMIN' || user?.role==='GM') UsersAPI.list(token).then(setUsers)
  }},[token, id])

  // Fetch project-wise material deliveries
  useEffect(()=>{ if(token && id){ MaterialsAPI.list(token, id).then(setMaterials).catch(()=>setMaterials([])) } },[token, id])

  const usersById = useMemo(()=>Object.fromEntries(users.map(u=>[u.id,u])),[users])

  const rows = useMemo(()=>{
    const r = []
    for(const i of income){ if ((i.projectId||'')===id){ r.push({ id:i.id, ts:i.ts, date:i.invoiceDate||i.ts, type:'Income', amount:+i.amount||0, desc:i.description||i.invoiceNo||'', userId:i.userId }) } }
    for(const e of expenses){ if ((e.projectId||'')===id){ r.push({ id:e.id, ts:e.ts, date:e.expenseDate||e.ts, type:'Expense', amount:+e.amount||0, desc:e.description||e.category||'', userId:e.userId }) } }
    r.sort((a,b)=> (a.date||0) - (b.date||0))
    return r
  },[income, expenses, id])

  const totals = useMemo(()=>{
    let ti=0, te=0
    for(const row of rows){ if(row.type==='Income') ti+=row.amount; else te+=row.amount }
    const materialTotal = (materials||[]).reduce((s,x)=> s + (Number(x.total)||0), 0)
    const materialVat = materialTotal * 0.05
    const materialGrand = materialTotal + materialVat
    const expenseCombined = te + materialGrand
    const profit = ti - expenseCombined
    return { income:ti, expense:te, materialTotal, materialVat, materialGrand, expenseCombined, profit }
  },[rows, materials])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Details</h1>
        <Link className="btn btn-outline" to="/projects/summary">Back to Summary</Link>
      </div>
      <div className="card">
        <div className="text-slate-700">
          <div className="font-semibold">{project? project.name : 'Project'}</div>
          {project && <div className="text-sm text-slate-500">Client: {project.client||'-'} • Budget: {(Number(project.budget)||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</div>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card"><div className="text-sm text-slate-500">Total Income</div><div className="text-xl font-semibold">{totals.income.toLocaleString(undefined,{style:'currency',currency:'AED'})}</div></div>
        <div className="card">
          <div className="text-sm text-slate-500">Total Expense (Expense + Material)</div>
          <div className="text-xl font-semibold">{totals.expenseCombined.toLocaleString(undefined,{style:'currency',currency:'AED'})}</div>
          <div className="text-xs text-slate-500 mt-1">Expense: {totals.expense.toLocaleString(undefined,{style:'currency',currency:'AED'})} • Material (Grand): {totals.materialGrand.toLocaleString(undefined,{style:'currency',currency:'AED'})}</div>
        </div>
        <div className="card"><div className="text-sm text-slate-500">Profit</div><div className={`text-xl font-semibold ${totals.profit<0?'text-red-600':'text-green-600'}`}>{totals.profit.toLocaleString(undefined,{style:'currency',currency:'AED'})}</div></div>
      </div>

      <div className="card overflow-auto">
        <table className="table min-w-[900px] table-fixed">
          <colgroup>
            <col style={{width:'14%'}} />
            <col style={{width:'12%'}} />
            <col style={{width:'18%'}} />
            <col style={{width:'40%'}} />
            <col style={{width:'16%'}} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Type</th>
              <th className="text-left">Amount</th>
              <th className="text-left">Description/Category</th>
              {(user?.role==='ADMIN' || user?.role==='GM') && (<th className="text-left">Added By</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={`${r.type}-${r.id}`}>
                <td className="text-left">{new Date(r.date||r.ts).toLocaleDateString()}</td>
                <td className="text-left">{r.type}</td>
                <td className="text-left">{r.amount.toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
                <td className="text-left">{r.desc}</td>
                {(user?.role==='ADMIN' || user?.role==='GM') && (<td className="text-left">{usersById[r.userId]?.name||r.userId||''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-auto">
        <div className="mb-2 text-slate-700 font-semibold">Materials (Project-wise)</div>
        <table className="table min-w-[900px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Material</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(materials||[]).map(m=> (
              <tr key={m.id}>
                <td>{new Date(m.invoiceDate||m.ts).toLocaleDateString()}</td>
                <td>{m.supplier}</td>
                <td>{m.materialName}</td>
                <td className="text-right">{m.quantity}</td>
                <td className="text-right">{(Number(m.unitPrice)||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
                <td className="text-right">{(Number(m.total)||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" className="text-right font-semibold">Materials Total (Grand inc. VAT 5%)</td>
              <td className="text-right font-semibold">{totals.materialGrand.toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
