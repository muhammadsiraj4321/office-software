import React, { useEffect, useMemo, useState } from 'react';
import { IncomeAPI, ProjectsAPI } from '../api';
import useAuth from '../store/auth';
import Modal from '../components/Modal';
import { canEdit, canDelete } from '../utils/rbac';

function useFilters(items) {
  const [mode, setMode] = useState('monthly'); // daily | monthly | project
  const [projectId, setProjectId] = useState('');
  const now = new Date();
  const filtered = useMemo(() => {
    if (mode === 'project' && projectId) return items.filter((x) => x.projectId === projectId);
    if (mode === 'daily') {
      const ymd = (d) => [d.getFullYear(), d.getMonth(), d.getDate()].join('-');
      return items.filter((x) => ymd(new Date(x.ts)) === ymd(now));
    }
    if (mode === 'monthly') {
      const ym = (d) => [d.getFullYear(), d.getMonth()].join('-');
      return items.filter((x) => ym(new Date(x.ts)) === ym(now));
    }
    return items;
  }, [items, mode, projectId]);
  return { mode, setMode, projectId, setProjectId, filtered };
}

export default function IncomePage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const { mode, setMode, projectId, setProjectId, filtered } = useFilters(items);

  useEffect(() => {
    if (token) {
      IncomeAPI.list(token).then(setItems);
      ProjectsAPI.list(token).then(setProjects);
    }
  }, [token]);

  const total = filtered.reduce((s, x) => s + (+x.amount || 0), 0);
  const fmtCurrency = (n) => (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'AED' });
  const fmtDate = (d) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Income</h1>
        <button className="btn" onClick={() => setShowAdd(true)}>Add Income</button>
      </div>

      <div className="card flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-600">Filters:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('daily')}
            className={
              'btn btn-outline ' +
              (mode === 'daily' ? '!bg-blue-600 !text-white !border-blue-600' : '')
            }
          >
            Daily
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={
              'btn btn-outline ' +
              (mode === 'monthly' ? '!bg-blue-600 !text-white !border-blue-600' : '')
            }
          >
            Monthly
          </button>
          <button
            onClick={() => setMode('project')}
            className={
              'btn btn-outline ' +
              (mode === 'project' ? '!bg-blue-600 !text-white !border-blue-600' : '')
            }
          >
            Project
          </button>
          {mode === 'project' && (
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="ml-auto text-sm text-slate-600">
          Total: <span className="font-semibold">{fmtCurrency(total)}</span>
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="table min-w-[600px]">
          <thead>
            <tr>
              <th>Invoice Date</th>
              <th>Project</th>
              <th>Received Amount</th>
              <th>Invoice No</th>
              <th>Description</th>
              <th>Created By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = projects.find((x) => x.id === r.projectId);
              return (
                <tr key={r.id}>
                  <td>{r.invoiceDate ? fmtDate(r.invoiceDate) : fmtDate(r.ts)}</td>
                  <td>{p ? p.name : r.projectId}</td>
                  <td>{fmtCurrency(r.amount)}</td>
                  <td>{r.invoiceNo || ''}</td>
                  <td>{r.description || ''}</td>
                  <td>{r.createdBy || ''}</td>
                  <td className="text-right">
                    {canEdit(user?.role, user?.id, r.userId, r.ts) && (
                      <button className="btn btn-outline mr-2" onClick={() => setEditing(r)}>Edit</button>
                    )}
                    {canDelete(user?.role, user?.id, r.userId, r.ts) && (
                      <button
                        className="btn btn-outline"
                        onClick={async () => {
                          if (confirm('Delete income?')) {
                            await IncomeAPI.remove(token, r.id);
                            setItems(await IncomeAPI.list(token));
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditIncomeModal
        open={!!editing}
        item={editing}
        projects={projects}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setItems(await IncomeAPI.list(token));
          setEditing(null);
        }}
      />
      <AddIncomeModal
        open={showAdd}
        projects={projects}
        onClose={() => setShowAdd(false)}
        onSaved={async () => {
          setItems(await IncomeAPI.list(token));
          setShowAdd(false);
        }}
      />
    </div>
  );
}

function AddIncomeModal({ open, onClose, onSaved, projects }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ projectId: '', amount: '', invoiceNo: '', invoiceDate: '', description: '' });
  const [errors, setErrors] = useState({});
  function validate() {
    const e = {};
    if (!form.projectId) e.projectId = 'Required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Enter a valid amount';
    if (!form.invoiceNo) e.invoiceNo = 'Required';
    if (!form.invoiceDate) e.invoiceDate = 'Required';
    setErrors(e); return Object.keys(e).length === 0;
  }
  async function submit(e) { e.preventDefault(); if (!validate()) return; await IncomeAPI.create(token, { projectId: form.projectId, amount: +form.amount, invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate, description: form.description }); onSaved?.() }
  return (
    <Modal open={open} onClose={onClose} title="Add Income">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Project</div>
          <select className="input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.projectId && <div className="text-xs text-red-600 mt-1">{errors.projectId}</div>}
        </div>
        <div>
          <div className="label">Received Amount</div>
          <input className="input" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          {errors.amount && <div className="text-xs text-red-600 mt-1">{errors.amount}</div>}
        </div>
        <div>
          <div className="label">Invoice No</div>
          <input className="input" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
          {errors.invoiceNo && <div className="text-xs text-red-600 mt-1">{errors.invoiceNo}</div>}
        </div>
        <div>
          <div className="label">Invoice Date</div>
          <input className="input" type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
          {errors.invoiceDate && <div className="text-xs text-red-600 mt-1">{errors.invoiceDate}</div>}
        </div>
        <div>
          <div className="label">Description (Optional)</div>
          <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn" type="submit">Save</button></div>
      </form>
    </Modal>
  );
}

function EditIncomeModal({ open, onClose, onSaved, item, projects }) {
  const { token } = useAuth();
  const [form, setForm] = useState(item || {});
  useEffect(() => { setForm(item || {}) }, [item]);
  async function submit(e) { e.preventDefault(); await IncomeAPI.update(token, item.id, { projectId: form.projectId, amount: +form.amount, description: form.description, invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate }); onSaved?.() }
  if (!item) return null;
  return (
    <Modal open={open} onClose={onClose} title="Edit Income">
      <form onSubmit={submit} className="space-y-3">
        <div><div className="label">Project</div><select className="input" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Select project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><div className="label">Received Amount</div><input className="input" type="number" step="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
        <div><div className="label">Invoice No</div><input className="input" value={form.invoiceNo || ''} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} /></div>
        <div><div className="label">Invoice Date</div><input className="input" type="date" value={form.invoiceDate || ''} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} /></div>
        <div><div className="label">Description (Optional)</div><input className="input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn" type="submit">Update</button></div>
      </form>
    </Modal>
  );
}
