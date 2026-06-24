import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import cuentaRoutes from './routes/cuenta.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware indispensable para procesar los JSON que te mande el Proxy/Frontend
app.use(express.json());

// Enlazar las rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/cuenta', cuentaRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Backend online', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TypeScript corriendo en http://localhost:${PORT}`);
});