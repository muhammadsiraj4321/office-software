import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import expenseRoutes from './routes/expenses.js';
import incomeRoutes from './routes/income.js';
import activityRoutes from './routes/activity.js';
import documentsRoutes from './routes/documents.js';
import materialsRoutes from './routes/materials.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/materials', materialsRoutes);

export default app;
