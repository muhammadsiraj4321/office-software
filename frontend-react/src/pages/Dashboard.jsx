import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpensesAPI, IncomeAPI, ProjectsAPI } from '../api';
import useAuth from '../store/auth';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import DocumentsCard from '../components/DocumentsCard.jsx';
import { canAddIncome, canCreateProject, canSeeDocuments } from '../utils/rbac';
import TrendChart from '../components/TrendChart';

export default function Dashboard() {
  const { user, token } = useAuth();
  const nav = useNavigate();
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      IncomeAPI.list(token).catch(() => []),
      ExpensesAPI.list(token).catch(() => []),
      ProjectsAPI.list(token).catch(() => []),
    ]).then(([inc, exp, proj]) => {
      setIncome(inc || []);
      setExpenses(exp || []);
      setProjects(proj || []);
    });
  }, [token]);

  const { totalIncomeMonth, totalExpenseMonth, ongoingCount, completedCount } = useMemo(() => {
    const now = new Date();
    const ym = (d) => d.getFullYear() + '-' + (d.getMonth() + 1);
    const incomeMonth = income
      .filter((i) => ym(new Date(i.ts)) === ym(now))
      .reduce((s, x) => s + (+x.amount || 0), 0);
    const expenseMonth = expenses
      .filter((i) => ym(new Date(i.ts)) === ym(now))
      .reduce((s, x) => s + (+x.amount || 0), 0);
    const ongoing = projects.filter((p) => p.status === 'ONGOING').length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    return {
      totalIncomeMonth: incomeMonth,
      totalExpenseMonth: expenseMonth,
      ongoingCount: ongoing,
      completedCount: completed,
    };
  }, [income, expenses, projects]);

  const trend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
    const fmtLab = (y, m) => new Date(y, m, 1).toLocaleString(undefined, { month: 'short' });
    const ym = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    const labels = months.map(({ y, m }) => fmtLab(y, m));
    const series = (arr) => months.map(({ y, m }) => arr.filter(x => ym(new Date(x.ts)) === `${y}-${m}`).reduce((s, x) => s + (+x.amount || 0), 0));
    return { labels, income: series(income), expenses: series(expenses) };
  }, [income, expenses]);

  const isEmployee = user?.role === 'EMPLOYEE';

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Income */}
        {!isEmployee && (
          <StatCard
            title="Income (This Month)"
            value={(Number(totalIncomeMonth)||0).toLocaleString(undefined,{ style:'currency', currency:'AED' })}
            onCta={canAddIncome(user) ? () => setShowAddIncome(true) : undefined}
            onClick={() => nav('/income')}
          />
        )}
        {/* 2. Expenses */}
        <StatCard
          title="Expense (This Month)"
          value={(Number(totalExpenseMonth)||0).toLocaleString(undefined,{ style:'currency', currency:'AED' })}
          onCta={() => setShowAddExpense(true)}
          onClick={() => nav('/expenses')}
        />
        {/* 3. Projects (Ongoing & Completed) */}
        {!isEmployee && (
          <StatCard
            title="Ongoing Projects"
            value={ongoingCount}
            onCta={canCreateProject(user) ? () => setShowAddProject(true) : undefined}
            onClick={() => nav('/projects')}
          />
        )}
        {!isEmployee && (
          <StatCard
            title="Completed Projects"
            value={completedCount}
            onClick={() => nav('/projects')}
          />
        )}
        {/* 4. Material Delivery */}
        {(user?.role==='ADMIN' || user?.role==='ACCOUNTANT') && (
          <StatCard
            title="Material Delivery"
            value="Open"
            onCta={() => nav('/material-delivery')}
            onClick={() => nav('/material-delivery')}
          />
        )}
        {/* 5. Documents */}
        {canSeeDocuments(user) && (
          <DocumentsCard onClick={() => nav('/documents')} />
        )}
        {/* 6. Users */}
        {user?.role==='ADMIN' && (
          <StatCard
            title="Users"
            value="Manage"
            onCta={() => nav('/admin/users')}
            onClick={() => nav('/admin/users')}
          />
        )}
        {/* 7. Activity */}
        {(user?.role==='ADMIN' || user?.role==='GM') && (
          <StatCard
            title="Activity Logs"
            value="View"
            onCta={() => nav('/activity')}
            onClick={() => nav('/activity')}
          />
        )}

        {!isEmployee && (
          <AddIncomeModal
            open={showAddIncome}
            onClose={() => setShowAddIncome(false)}
            onSaved={() => {
              IncomeAPI.list(token).then(setIncome);
              setShowAddIncome(false);
            }}
          />
        )}
        <AddExpenseModal
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSaved={() => {
            ExpensesAPI.list(token).then(setExpenses);
            setShowAddExpense(false);
          }}
        />
        {!isEmployee && canCreateProject(user) && (
          <AddProjectModal
            open={showAddProject}
            onClose={() => setShowAddProject(false)}
            onSaved={() => {
              ProjectsAPI.list(token).then(setProjects);
              setShowAddProject(false);
            }}
          />
        )}
      </div>
      <div className="mt-4">
        <TrendChart labels={trend.labels} income={isEmployee ? trend.income.map(()=>0) : trend.income} expenses={trend.expenses} />
      </div>
    </div>
  );
}

function AddIncomeModal({ open, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ projectId: '', amount: '', note: '' });
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    if (open) ProjectsAPI.list(token).then(setProjects);
  }, [open, token]);
  async function submit(e) {
    e.preventDefault();
    await IncomeAPI.create(token, { ...form, amount: +form.amount });
    onSaved?.();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Income">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Project</div>
          <select
            className="input"
            required
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Select project</option>
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
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Note</div>
          <input
            className="input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
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

function AddExpenseModal({ open, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ projectId: '', amount: '', note: '' });
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    if (open) ProjectsAPI.list(token).then(setProjects);
  }, [open, token]);
  async function submit(e) {
    e.preventDefault();
    await ExpensesAPI.create(token, { ...form, amount: +form.amount });
    onSaved?.();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Expense">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Project</div>
          <select
            className="input"
            required
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Select project</option>
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
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Note</div>
          <input
            className="input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
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

function AddProjectModal({ open, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', client: '', budget: '' });
  async function submit(e) {
    e.preventDefault();
    await ProjectsAPI.create(token, { ...form, budget: +form.budget });
    onSaved?.();
  }
  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <div className="label">Name</div>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Client</div>
          <input
            className="input"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
          />
        </div>
        <div>
          <div className="label">Budget</div>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
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
