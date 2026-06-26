import { Router } from 'express';
import { obtenerSaldos, ingresarFondos } from '../controllers/cuenta.controller.js';
import { requerirSesion } from '../middlewares/auth.middleware.js'; 

const router = Router();

// GET /api/cuenta/saldo 
// Primero pasa por 'requerirSesion', si aprueba, va a 'obtenerSaldos'
router.get('/saldo', requerirSesion, obtenerSaldos);
// POST /api/cuenta/ingresar -> Cargar dinero en una cuenta 
router.post('/ingresar', requerirSesion, ingresarFondos);
export default router;