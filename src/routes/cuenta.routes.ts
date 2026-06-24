import { Router } from 'express';
import { obtenerSaldos } from '../controllers/cuenta.controller.js';
import { requerirSesion } from '../middlewares/auth.middleware.js'; // el guardián

const router = Router();

// GET /api/cuenta/saldo 
// Primero pasa por 'requerirSesion', si aprueba, va a 'obtenerSaldos'
router.get('/saldo', requerirSesion, obtenerSaldos);

export default router;