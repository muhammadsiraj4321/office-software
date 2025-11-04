import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExpensesAPI, ProjectsAPI, MaterialsAPI } from '../api'
import useAuth from '../store/auth'
import Modal from '../components/Modal'
import { canEdit, canDelete } from '../utils/rbac'

function useFilters(items) {
  const [mode, setMode] = useState('monthly');
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

export default function ExpensesPage(){
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const { mode, setMode, projectId, setProjectId, filtered } = useFilters(items);
  const [materialsGrandAll, setMaterialsGrandAll] = useState(0);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      ExpensesAPI.list(token).then(setItems);
      ProjectsAPI.list(token).then(setProjects);
    }
  }, [token]);

  // Fetch Materials Delivery totals across ALL projects and compute grand (incl. 5% VAT)
  useEffect(() => {
    async function loadAllMaterials() {
      if (!token) return;
      setMaterialsLoading(true);
      try {
        const list = await ProjectsAPI.list(token);
        const projIds = ['GENERAL', ...list.map(p => p.id)];
        let sumTotals = 0;
        for (const pid of projIds) {
          try {
            const mats = await MaterialsAPI.list(token, pid);
            sumTotals += mats.reduce((s, m) => s + (+m.total || 0), 0);
          } catch (_) { /* ignore per-project errors */ }
        }
        const vat = sumTotals * 0.05;
        setMaterialsGrandAll(sumTotals + vat);
      } finally {
        setMaterialsLoading(false);
      }
    }
    loadAllMaterials();
    function onFocus(){ loadAllMaterials(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token]);

  const total = filtered.reduce((s, x) => s + (+x.amount || 0), 0);
  const allProjects = [{ id: 'GENERAL', name: 'General' }, ...projects];
  const fmtCurrency = (n) => (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'AED' });
  const fmtDate = (d) => new Date(d).toLocaleDateString();
  const mainTotal = materialsGrandAll + total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Expenses</h1>
        <button className="btn" onClick={() => setShowAdd(true)}>
          Add Expense
        </button>
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
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <button className="card text-left" onClick={()=>navigate('/material-delivery')}>
          <div className="text-sm text-slate-500">Materials Delivery Total Expense</div>
          <div className="text-xl font-semibold">{materialsLoading ? 'Loading…' : fmtCurrency(materialsGrandAll)}</div>
          <div className="text-xs text-blue-600 mt-1">Go to Material Delivery →</div>
        </button>
        <div className="card">
          <div className="text-sm text-slate-500">Expenses</div>
          <div className="text-xl font-semibold">{fmtCurrency(total)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Main Total (Materials + Expenses)</div>
          <div className="text-xl font-semibold">{fmtCurrency(mainTotal)}</div>
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th>Expense Date</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Created By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = r.projectId === 'GENERAL' ? { name: 'General' } : projects.find((x) => x.id === r.projectId);
              return (
                <tr key={r.id}>
                  <td>{r.expenseDate ? fmtDate(r.expenseDate) : fmtDate(r.ts)}</td>
                  <td>{p ? p.name : r.projectId}</td>
                  <td>{fmtCurrency(r.amount)}</td>
                  <td>{r.description || ''}</td>
                  <td>{r.createdBy || r.userId || ''}</td>
                  <td className="text-right">
                    {canEdit(user?.role, user?.id, r.userId, r.ts) && (
                      <button className="btn btn-outline mr-2" onClick={() => setEditing(r)}>Edit</button>
                    )}
                    {canDelete(user?.role, user?.id, r.userId, r.ts) && (
                      <button
                        className="btn btn-outline"
                        onClick={async () => {
                          if (confirm('Delete expense?')) {
                            await ExpensesAPI.remove(token, r.id);
                            setItems(await ExpensesAPI.list(token));
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

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={async () => {
          setItems(await ExpensesAPI.list(token));
          setShowAdd(false);
        }}
        projects={projects}
      />
      <EditExpenseModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setItems(await ExpensesAPI.list(token));
          setEditing(null);
        }}
        item={editing}
        projects={projects}
      />
    </div>
  );
}

function AddExpenseModal({ open, onClose, onSaved, projects }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ projectId: '', amount: '', expenseDate: '', description: '' });
  const [errors, setErrors] = useState({});
  function validate() {
    const e = {};
    if (!form.projectId) e.projectId = 'Required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Enter a valid amount';
    if (!form.expenseDate) e.expenseDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    await ExpensesAPI.create(token, {
      projectId: form.projectId,
      amount: +form.amount,
      expenseDate: form.expenseDate,
      description: form.description,
    });
    onSaved?.();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Expense">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Project</div>
          <select
            className="input"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Select project</option>
            <option value="GENERAL">General</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.projectId && <div className="text-xs text-red-600 mt-1">{errors.projectId}</div>}
        </div>
        <div>
          <div className="label">Amount</div>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          {errors.amount && <div className="text-xs text-red-600 mt-1">{errors.amount}</div>}
        </div>
        <div>
          <div className="label">Expense Date</div>
          <input
            className="input"
            type="date"
            value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
          />
          {errors.expenseDate && <div className="text-xs text-red-600 mt-1">{errors.expenseDate}</div>}
        </div>
        <div>
          <div className="label">Description</div>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditExpenseModal({ open, onClose, onSaved, item, projects }) {
  const { token } = useAuth();
  const [form, setForm] = useState(item || {});
  useEffect(() => {
    setForm(item || {});
  }, [item]);
  async function submit(e) {
    e.preventDefault();
    await ExpensesAPI.update(token, item.id, {
      projectId: form.projectId,
      amount: +form.amount,
      description: form.description,
      expenseDate: form.expenseDate,
    });
    onSaved?.();
  }
  if (!item) return null;
  return (
    <Modal open={open} onClose={onClose} title="Edit Expense">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Project</div>
          <select
            className="input"
            value={form.projectId || ''}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Select project</option>
            <option value="GENERAL">General</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">Amount</div>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Expense Date</div>
          <input
            className="input"
            type="date"
            value={form.expenseDate || ''}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Description</div>
          <input
            className="input"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit">
            Update
          </button>
        </div>
      </form>
    </Modal>
  );
}
