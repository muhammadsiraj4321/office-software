import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectsAPI, IncomeAPI, ExpensesAPI, MaterialsAPI } from '../api'
import useAuth from '../store/auth'

export default function ProjectsSummary(){
  const { token } = useAuth()
  const [projects, setProjects] = useState([])
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [materialsByProject, setMaterialsByProject] = useState({})

  useEffect(()=>{ if(token){
    ProjectsAPI.list(token).then(setProjects)
    IncomeAPI.list(token).then(setIncome)
    ExpensesAPI.list(token).then(setExpenses)
  } },[token])

  // Fetch material totals per project (strictly project-wise)
  useEffect(()=>{
    (async()=>{
      if(!token || !projects.length) return
      const entries = await Promise.all(projects.map(async p => {
        try{
          const list = await MaterialsAPI.list(token, p.id)
          const total = (list||[]).reduce((s,x)=> s + (Number(x.total)||0), 0)
          const vat = total * 0.05
          const grand = total + vat
          return [p.id, { total, vat, grand }]
        }catch{
          return [p.id, { total:0, vat:0, grand:0 }]
        }
      }))
      setMaterialsByProject(Object.fromEntries(entries))
    })()
  },[token, projects])

  const rows = useMemo(()=>{
    const byId = {}
    for (const p of projects) byId[p.id] = { id:p.id, name:p.name, income:0, expense:0, material:0, materialVat:0, materialGrand:0 }
    // Include GENERAL bucket too
    byId['GENERAL'] = byId['GENERAL'] || { id:'GENERAL', name:'General', income:0, expense:0, material:0, materialVat:0, materialGrand:0 }

    for (const i of income){
      const k = i.projectId || 'GENERAL'
      if (!byId[k]) byId[k] = { id:k, name:k, income:0, expense:0 }
      byId[k].income += Number(i.amount)||0
    }
    for (const e of expenses){
      const k = e.projectId || 'GENERAL'
      if (!byId[k]) byId[k] = { id:k, name:k, income:0, expense:0 }
      byId[k].expense += Number(e.amount)||0
    }
    // Add material grand totals per project
    for (const p of projects){
      const mt = materialsByProject[p.id] || { total:0, vat:0, grand:0 }
      if (!byId[p.id]) byId[p.id] = { id:p.id, name:p.name, income:0, expense:0, material:0, materialVat:0, materialGrand:0 }
      byId[p.id].material = mt.total
      byId[p.id].materialVat = mt.vat
      byId[p.id].materialGrand = mt.grand
    }
    const arr = Object.values(byId)
      .filter(r=> r.id==='GENERAL' || projects.some(p=>p.id===r.id))
      .map(r=> ({
        ...r,
        // Profit = Income - Expense - Material (grand)
        profit: (r.income - r.expense - (r.materialGrand||0)),
      }))
    // Sort: by name, with GENERAL last
    arr.sort((a,b)=>{
      if(a.id==='GENERAL' && b.id!=='GENERAL') return 1
      if(b.id==='GENERAL' && a.id!=='GENERAL') return -1
      return String(a.name||a.id).localeCompare(String(b.name||b.id))
    })
    return arr
  },[projects,income,expenses,materialsByProject])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Summary</h1>
        <Link className="btn btn-outline" to="/projects">Back to Projects</Link>
      </div>
      <div className="card overflow-auto">
        <table className="table min-w-[1000px] table-fixed">
          <colgroup>
            <col />
            <col style={{width:'20%'}} />
            <col style={{width:'20%'}} />
            <col style={{width:'22%'}} />
            <col style={{width:'18%'}} />
          </colgroup>
          <thead>
            <tr>
              <th>Project Name</th>
              <th className="text-left">Total Income</th>
              <th className="text-left">Total Expense</th>
              <th className="text-left">Material Expense (Grand)</th>
              <th className="text-left">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id}>
                <td>
                  {r.id==='GENERAL' ? (
                    <span>General</span>
                  ) : (
                    <Link to={`/projects/${r.id}/details`} className="link">{r.name}</Link>
                  )}
                </td>
                <td className="text-left">{(r.income||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
                <td className="text-left">{(r.expense||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
                <td className="text-left">{(r.materialGrand||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
                <td className={`text-left ${r.profit<0 ? 'text-red-600' : 'text-green-600'}`}>{(r.profit||0).toLocaleString(undefined,{style:'currency',currency:'AED'})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
