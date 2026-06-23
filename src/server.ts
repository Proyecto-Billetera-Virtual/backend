import express from 'express';
import dotenv from 'dotenv';

// Configurar dotenv para leer las variables del .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para parsear JSON en el body
app.use(express.json());

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'Backend online', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TypeScript corriendo en http://localhost:${PORT}`);
});