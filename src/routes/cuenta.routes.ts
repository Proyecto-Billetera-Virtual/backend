import { Router } from 'express';
import { obtenerSaldos, ingresarFondos, retirarFondos, transferirFondos } from '../controllers/cuenta.controller.js'; // <-- Importamos retirarFondos
import { requerirSesion } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/saldo', requerirSesion, obtenerSaldos);
router.post('/ingresar', requerirSesion, ingresarFondos);

// POST /api/cuenta/retirar -> Extraer dinero de una cuenta (Nueva ruta)
router.post('/retirar', requerirSesion, retirarFondos);

router.post('/transferir', requerirSesion, transferirFondos);
export default router;