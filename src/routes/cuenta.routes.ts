import { Router } from 'express';
import { 
  obtenerSaldos, 
  ingresarFondos, 
  retirarFondos, 
  transferirFondos,
  obtenerMovimientos 
} from '../controllers/cuenta.controller.js'; 
import { requerirSesion } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/saldo', requerirSesion, obtenerSaldos);
router.post('/ingreso', requerirSesion, ingresarFondos);
router.post('/retirar', requerirSesion, retirarFondos);
router.post('/transferir', requerirSesion, transferirFondos);

router.get('/movimientos', requerirSesion, obtenerMovimientos);

export default router;