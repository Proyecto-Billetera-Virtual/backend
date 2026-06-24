import { Router } from 'express';
import { registrarUsuario, verificarCuenta } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registrarUsuario);

// GET /api/auth/verify (Ruta que clickea el usuario desde el mail)
router.get('/verify', verificarCuenta);

export default router;