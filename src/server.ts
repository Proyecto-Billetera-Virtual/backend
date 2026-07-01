import express from 'express';
// 🚨 CORREGIDO: Importación exclusiva de tipos para cumplir con verbatimModuleSyntax
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import cuentaRoutes from './routes/cuenta.routes.js';
import internoRoutes from './routes/interno.routes.js';

dotenv.config();

const app = express();
const HOST = process.env.HOST || '192.168.220.130';
const PORT = process.env.PORT || 5000;

// Middlewares globales esenciales para procesamiento de datos
app.use(cors());
app.use(express.json());

// 🚦 Endpoint de control local (Health Check)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Backend online', timestamp: new Date() });
});

// 🔌 Enlazar los módulos de rutas (Respetando el Contrato de APIs y sin '/api')
app.use('/auth', authRoutes);
app.use('/cuenta', cuentaRoutes);

// 🚨 CORREGIDO: Las rutas internas ya tienen el prefijo '/interno' adentro del archivo.
// Al montarlo sobre '/', Express leerá literalmente '/interno/saldo' e '/interno/actualizar-saldo'.
app.use('/', internoRoutes);

// 🚨 CORREGIDO: Para que Docker o el Proxy puedan redirigir tráfico a tu IP local,
// Express DEBE escuchar explícitamente en el HOST, no solo en el puerto.
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Servidor TypeScript corriendo en http://${HOST}:${PORT}`);
  console.log(`🔑 Módulo Autenticación: http://${HOST}:${PORT}/auth`);
  console.log(`💰 Módulo Cuentas:       http://${HOST}:${PORT}/cuenta`);
  console.log(`🔒 Canal Privado Interno: http://${HOST}:${PORT}/interno`);
});