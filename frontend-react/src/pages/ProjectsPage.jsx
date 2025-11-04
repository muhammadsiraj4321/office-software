import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectsAPI, UsersAPI } from '../api';
import useAuth from '../store/auth';
import Modal from '../components/Modal';
import { canCreateProject, canEdit, canDelete } from '../utils/rbac';

export default function ProjectsPage() {
  const { token } = useAuth();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState('ongoing'); // ongoing | completed | all
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (token) {
      ProjectsAPI.list(token).then(setItems);
      if (user?.role==='ADMIN') {
        UsersAPI.list(token).then(setUsers).catch(()=>{})
      }
    }
  }, [token]);

  const filtered = useMemo(() => {
    if (tab === 'ongoing') return items.filter((p) => p.status === 'ONGOING');
    if (tab === 'completed') return items.filter((p) => p.status === 'COMPLETED');
    return items;
  }, [items, tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex items-center gap-2">
          <Link className="btn btn-outline" to="/projects/summary">Summary</Link>
          {canCreateProject(user) && (
            <button className="btn" onClick={() => setShowAdd(true)}>
              New Project
            </button>
          )}
        </div>
      </div>

      <div className="card flex items-center gap-2">
        <button
          onClick={() => setTab('ongoing')}
          className={
            'btn btn-outline ' +
            (tab === 'ongoing' ? '!bg-blue-600 !text-white !border-blue-600' : '')
          }
        >
          Ongoing
        </button>
        <button
          onClick={() => setTab('completed')}
          className={
            'btn btn-outline ' +
            (tab === 'completed' ? '!bg-blue-600 !text-white !border-blue-600' : '')
          }
        >
          Completed
        </button>
        <button
          onClick={() => setTab('all')}
          className={
            'btn btn-outline ' + (tab === 'all' ? '!bg-blue-600 !text-white !border-blue-600' : '')
          }
        >
          All
        </button>
        <div className="ml-auto text-sm text-slate-600">
          Total: <span className="font-semibold">{filtered.length}</span>
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="table min-w-[900px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const usersById = Object.fromEntries(users.map(u=>[u.id,u]));
              const creator = p.createdBy || usersById[p.userId]?.name || '';
              return (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.client || ''}</td>
                <td>{(Number(p.budget) || 0).toLocaleString(undefined, { style: 'currency', currency: 'AED' })}</td>
                <td>
                  {p.status === 'ONGOING' ? (
                    <span className="badge badge-amber">Ongoing</span>
                  ) : (
                    <span className="badge badge-green">Completed</span>
                  )}
                </td>
                <td>{(p.assignedUsers || []).length}</td>
                <td>{creator}</td>
                <td className="text-right">
                  {canEdit(user?.role, user?.id, p.userId, p.ts) && (
                    <button className="btn btn-outline mr-2" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                  )}
                  {user?.role!=='ACCOUNTANT' && canDelete(user?.role, user?.id, p.userId, p.ts) && (
                    <button
                      className="btn btn-outline"
                      onClick={async () => {
                        if (confirm('Delete project?')) {
                          await ProjectsAPI.remove(token, p.id);
                          setItems(await ProjectsAPI.list(token));
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <AddProjectModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={async () => {
          setItems(await ProjectsAPI.list(token));
          setShowAdd(false);
        }}
      />
      <EditProjectModal
        open={!!editing}
        project={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setItems(await ProjectsAPI.list(token));
          setEditing(null);
        }}
      />
    </div>
  );
}

function AddProjectModal({ open, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', client: '', budget: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Name is required'); return }
    if (!token) { setError('Not authenticated. Please reload.'); return }
    try {
      setSubmitting(true)
      await ProjectsAPI.create(token, { ...form, budget: +form.budget, assignedUsers: [] })
      onSaved?.()
    } catch (err) {
      console.error('Project create failed', err)
      setError(err.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={submit} className="space-y-3">
        <div><div className="label">Name</div><input className="input" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></div>
        <div><div className="label">Client</div><input className="input" value={form.client} onChange={e=>setForm({...form, client:e.target.value})}/></div>
        <div><div className="label">Budget</div><input className="input" type="number" step="0.01" value={form.budget} onChange={e=>setForm({...form, budget:e.target.value})}/></div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn" type="submit" disabled={submitting}>{submitting?'Saving...':'Save'}</button></div>
      </form>
    </Modal>
  )
}

function EditProjectModal({ open, onClose, onSaved, project }) {
  const { token } = useAuth();
  const [form, setForm] = useState(project||{});
  useEffect(()=>{ setForm(project||{}) },[project])
  if (!project) return null
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  async function submit(e){
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Name is required'); return }
    try {
      setSubmitting(true)
      await ProjectsAPI.update(token, project.id, { name: form.name, client: form.client, budget: +form.budget, status: form.status })
      onSaved?.()
    } catch (err) {
      console.error('Project update failed', err)
      setError(err.message || 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Edit Project">
      <form onSubmit={submit} className="space-y-3">
        <div><div className="label">Name</div><input className="input" required value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})}/></div>
        <div><div className="label">Client</div><input className="input" value={form.client||''} onChange={e=>setForm({...form, client:e.target.value})}/></div>
        <div><div className="label">Budget</div><input className="input" type="number" step="0.01" value={form.budget||''} onChange={e=>setForm({...form, budget:e.target.value})}/></div>
        <div><div className="label">Status</div>
          <select className="input" value={form.status||'ONGOING'} onChange={e=>setForm({...form, status:e.target.value})}>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn" type="submit" disabled={submitting}>{submitting?'Updating...':'Update'}</button></div>
      </form>
    </Modal>
  )
}
