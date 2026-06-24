import { Router } from 'express';
import { registrarUsuario, verificarCuenta, loginUsuario } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register -> Registro de usuarios
router.post('/register', registrarUsuario);

// GET /api/auth/verify -> Validación por correo electrónico
router.get('/verify', verificarCuenta);

// POST /api/auth/login -> Inicio de sesión (Nueva ruta)
router.post('/login', loginUsuario);

export default router;