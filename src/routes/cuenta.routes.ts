import { Router } from 'express';
import { obtenerSaldos, ingresarFondos, obtenerMovimientos } from '../controllers/cuenta.controller.js';
import { requerirSesion } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/saldo', requerirSesion, obtenerSaldos);
router.post('/ingreso', requerirSesion, ingresarFondos);
router.get('/movimientos', requerirSesion, obtenerMovimientos);

export default router;
