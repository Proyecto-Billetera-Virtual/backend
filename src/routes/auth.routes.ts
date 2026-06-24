import { Router } from 'express';
import { registrarUsuario } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registrarUsuario);

export default router;