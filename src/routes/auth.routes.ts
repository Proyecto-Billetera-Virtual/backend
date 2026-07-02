import { Router } from 'express';
import { registrarUsuario, verificarConCodigo, reenviarCodigo, loginUsuario, recuperarPassword, resetearPassword } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registrarUsuario);
router.post('/verify-code', verificarConCodigo);
router.post('/reenviar-codigo', reenviarCodigo);
router.post('/login', loginUsuario);
router.post('/recuperar', recuperarPassword);
router.post('/forgot-password', recuperarPassword);
router.post('/resetear', resetearPassword);
router.post('/reset-password', resetearPassword);

export default router;
