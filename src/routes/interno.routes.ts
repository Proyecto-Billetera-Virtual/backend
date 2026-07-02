import { Router } from 'express';
import { consultarSaldoInterno, actualizarSaldoInterno } from '../controllers/cuenta.controller.js';
import { buscarUsuarioPorEmail, crearOperacionPendiente, confirmarOperacionPendiente, registrarMovimientoExterno } from '../controllers/interno.controller.js';

const router = Router();

router.get('/saldo/:usuario_id', consultarSaldoInterno);
router.post('/actualizar-saldo', actualizarSaldoInterno);
router.post('/usuarios/buscar', buscarUsuarioPorEmail);
router.post('/operaciones/crear', crearOperacionPendiente);
router.post('/operaciones/confirmar', confirmarOperacionPendiente);
router.post('/registrar-movimiento', registrarMovimientoExterno);

export default router;
