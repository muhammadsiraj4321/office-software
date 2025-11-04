import app from './app.js';
import usersRouter from './routes/users.js';
import materialsRouter from './routes/materials.js';

const PORT = process.env.PORT || 3000;
app.use('/api/materials', materialsRouter);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
