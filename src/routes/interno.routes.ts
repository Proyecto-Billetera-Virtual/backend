import { Router } from 'express';
import type {Request, Response } from 'express';
import { dbQueryGet, dbRun } from '../db/connection.js';

const router = Router();

// 1. GET /interno/saldo/:usuario_id
router.get('/interno/saldo/:usuario_id', async (req: Request, res: Response): Promise<void> => {
  // 1. Forzamos a que sea un string plano pasándolo por String() o asegurando el tipo
  const usuarioIdParam = req.params.usuario_id;

  // 🚨 REGLA 1: Validación estricta garantizando que trabajamos con un String limpio
  if (
    !usuarioIdParam || 
    typeof usuarioIdParam !== 'string' ||
    usuarioIdParam.trim() === '' || 
    usuarioIdParam.toLowerCase() === 'undefined' || 
    isNaN(Number(usuarioIdParam))
  ) {
    res.status(400).json({ error: "ID de usuario inválido o no provisto" });
    return;
  }

  // 2. Ahora que es seguro, lo convertimos a número para SQLite
  const userIdNumerico = Number(usuarioIdParam);

  try {
    // Ejecutamos un COUNT junto con los SUM para saber si el usuario realmente existe en la DB
    const resultado = await dbQueryGet(
      `SELECT 
        COUNT(id) as total_cuentas,
        SUM(CASE WHEN moneda = 'ARS' THEN saldo ELSE 0 END) as saldo_ars,
        SUM(CASE WHEN moneda = 'USD' THEN saldo ELSE 0 END) as saldo_usd
       FROM cuentas 
       WHERE usuario_id = ?`,
      [userIdNumerico]
    );

    // 🚨 REGLA 2: Si el COUNT es 0, el usuario no existe en la tabla cuentas. 
    // Respondemos un 404 limpio en lugar de inventar saldos en 0.
    if (!resultado || resultado.total_cuentas === 0) {
      res.status(404).json({ error: "Usuario no encontrado en la base de datos" });
      return;
    }

    // Si pasó las validaciones, devolvemos el éxito biónico con los datos reales
    res.status(200).json({
      usuario_id: userIdNumerico,
      saldo_ars: Number(resultado.saldo_ars || 0),
      saldo_usd: Number(resultado.saldo_usd || 0)
    });

  } catch (error) {
    console.error('❌ [Error DB Interno] Falló la consulta de saldos:', error);
    res.status(500).json({ error: "Error interno del servidor al procesar la consulta." });
  }
});

router.get('/saldo/:usuario_id', async (req: Request, res: Response): Promise<void> => {
  const { usuario_id } = req.params;

  // Validación de parámetro numérico
  if (!usuario_id || isNaN(Number(usuario_id))) {
    res.status(400).json({ error: 'El parámetro usuario_id debe ser un número válido.' });
    return;
  }

  try {
    // Agrupamos en una sola consulta las cuentas ARS y USD del usuario
    const cuentas = await dbQueryGet(
      `SELECT 
        SUM(CASE WHEN moneda = 'ARS' THEN saldo ELSE 0 END) as saldo_ars,
        SUM(CASE WHEN moneda = 'USD' THEN saldo ELSE 0 END) as saldo_usd,
        COUNT(id) as total_cuentas
       FROM cuentas WHERE usuario_id = ?`,
      [usuario_id]
    );

    // Si el conteo es 0, significa que el usuario no existe en el sistema
    if (!cuentas || cuentas.total_cuentas === 0) {
      res.status(404).json({ error: `No se encontraron cuentas para el usuario con ID ${usuario_id}.` });
      return;
    }

    res.status(200).json({
      usuario_id: Number(usuario_id),
      saldo_ars: Number(cuentas.saldo_ars || 0),
      saldo_usd: Number(cuentas.saldo_usd || 0)
    });

  } catch (error) {
    console.error('❌ [Error DB] En GET /interno/saldo:', error);
    res.status(500).json({ error: 'Error interno del servidor al consultar el saldo.' });
  }
});

// 2. POST /interno/actualizar-saldo
router.post('/actualizar-saldo', async (req: Request, res: Response): Promise<void> => {
  const { usuario_id, accion, moneda, monto } = req.body;

  // Validaciones estrictas del Body
  if (!usuario_id || !accion || !moneda || monto === undefined) {
    res.status(400).json({ error: 'Faltan campos mandatorios en el body ({ usuario_id, accion, moneda, monto }).' });
    return;
  }

  if (accion !== 'SUMAR' && accion !== 'RESTAR') {
    res.status(400).json({ error: 'La acción debe ser "SUMAR" o "RESTAR".' });
    return;
  }

  if (moneda !== 'ARS' && moneda !== 'USD') {
    res.status(400).json({ error: 'Moneda no soportada. Solo se permite "ARS" o "USD".' });
    return;
  }

  if (isNaN(Number(monto)) || Number(monto) <= 0) {
    res.status(400).json({ error: 'El monto debe ser un número positivo mayor a cero.' });
    return;
  }

  try {
    // 1. Validar existencia de la cuenta específica
    const cuenta = await dbQueryGet(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?',
      [usuario_id, moneda]
    );

    if (!cuenta) {
      res.status(404).json({ error: `No existe una cuenta en ${moneda} para el usuario ${usuario_id}.` });
      return;
    }

    let nuevoSaldo = Number(cuenta.saldo);

    // 2. Calcular e impedir saldos negativos si es una resta
    if (accion === 'RESTAR') {
      if (nuevoSaldo < Number(monto)) {
        res.status(422).json({ error: 'Fondos insuficientes para realizar la operación interna.' });
        return;
      }
      nuevoSaldo -= Number(monto);
    } else {
      nuevoSaldo += Number(monto);
    }

    // 3. Ejecutar UPDATE en SQLite
    await dbRun(
      'UPDATE cuentas SET saldo = ? WHERE id = ?',
      [nuevoSaldo, cuenta.id]
    );

    // 4. Registro automático en el historial de auditoría (Issue 10)
    await dbRun(
      `INSERT INTO movimientos (cuenta_id, tipo, monto, detalle, fecha) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        cuenta.id, 
        accion === 'RESTAR' ? 'RETIRO' : 'INGRESO', 
        monto, 
        `Débito/Crédito automático vía Pasarela Interna`, 
        Date.now()
      ]
    );

    res.status(200).json({
      status: 'updated',
      nuevo_saldo: nuevoSaldo
    });

  } catch (error) {
    console.error('❌ [Error DB] En POST /interno/actualizar-saldo:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la actualización del saldo.' });
  }
});

export default router;