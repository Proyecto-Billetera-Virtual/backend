import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import cuentaRoutes from './routes/cuenta.routes.js';
import internoRoutes from './routes/interno.routes.js';
import inicializarTablas from './db/initDb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/cuenta', cuentaRoutes);
app.use('/api/interno', internoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Backend online', timestamp: new Date() });
});

inicializarTablas().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
  });
});
