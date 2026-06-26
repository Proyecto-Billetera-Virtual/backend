import { type Request, type Response } from 'express';
import { db, dbRun, dbQueryGet } from '../db/connection.js';

export const obtenerSaldos = (req: Request, res: Response): void => {
  const usuarioId = req.usuarioId; // Obtenido de forma segura desde el middleware

  // Consulta directa a la tabla cuentas en SQLite
  db.all('SELECT moneda, saldo FROM cuentas WHERE usuario_id = ?', [usuarioId], (err, rows: any[]) => {
    if (err) {
      console.error('❌ Error al obtener saldos:', err.message);
      res.status(500).json({ error: 'Error interno al consultar los saldos.' });
      return;
    }

    // Mapear las filas a un JSON cómodo para el Frontend/Proxy
    const respuestaSaldos = {
      saldo_ars: 0,
      saldo_usd: 0
    };

    rows.forEach((row) => {
      if (row.moneda === 'ARS') respuestaSaldos.saldo_ars = row.saldo;
      if (row.moneda === 'USD') respuestaSaldos.saldo_usd = row.saldo;
    });

    res.status(200).json(respuestaSaldos);
  });
};
export const ingresarFondos = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuarioId; // Servido en bandeja por el middleware de sesión
  const { moneda, monto } = req.body;

  // 1. Validaciones básicas de entrada
  if (!moneda || monto === undefined) {
    res.status(400).json({ error: 'La moneda (ARS/USD) y el monto son obligatorios.' });
    return;
  }

  if (moneda !== 'ARS' && moneda !== 'USD') {
    res.status(400).json({ error: 'Moneda no soportada. Solo se permite ARS o USD.' });
    return;
  }

  if (typeof monto !== 'number' || monto <= 0) {
    res.status(400).json({ error: 'El monto debe ser un número mayor a cero.' });
    return;
  }

  try {
    // 2. Verificar que la cuenta del usuario realmente exista para esa moneda
    const cuenta = await dbQueryGet(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?',
      [usuarioId, moneda]
    );

    if (!cuenta) {
      res.status(404).json({ error: `No se encontró una billetera en ${moneda} para este usuario.` });
      return;
    }

    const nuevoSaldo = cuenta.saldo + monto;

    // 3. Iniciar transacción para asegurar consistencia física en la DB
    await dbRun('BEGIN TRANSACTION;');

    try {
      // 4. Actualizar el saldo en la tabla 'cuentas'
      await dbRun(
        'UPDATE cuentas SET saldo = ? WHERE usuario_id = ? AND moneda = ?',
        [nuevoSaldo, usuarioId, moneda]
      );

      // Confirmar los cambios en SQLite
      await dbRun('COMMIT;');

    } catch (transactionError) {
      // Si el UPDATE o el COMMIT fallan, hacemos ROLLBACK de inmediato de forma segura
      try {
        await dbRun('ROLLBACK;');
      } catch (rollbackErr) {
        console.error('⚠️ No se pudo ejecutar el ROLLBACK:', rollbackErr);
      }
      throw transactionError; // Relanzamos el error para que lo ataje el catch principal
    }

    // 5. RESPUESTA ÚNICA DE ÉXITO (Se ejecuta solo si la transacción fue exitosa y se cerró)
    res.status(200).json({
      message: `Ingreso de ${moneda} exitoso.`,
      moneda,
      monto_ingresado: monto,
      nuevo_saldo: nuevoSaldo
    });

  } catch (error) {
    console.error('❌ Error al ingresar fondos:', error);
    
    // Validamos que no hayamos enviado una respuesta previa para evitar el ERR_HTTP_HEADERS_SENT
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ocurrió un error interno al procesar el depósito.' });
    }
  }
};
export const retirarFondos = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuarioId; // Servido por el middleware de sesión
  const { moneda, monto } = req.body;

  // 1. Validaciones básicas de entrada
  if (!moneda || monto === undefined) {
    res.status(400).json({ error: 'La moneda (ARS/USD) y el monto son obligatorios.' });
    return;
  }

  if (moneda !== 'ARS' && moneda !== 'USD') {
    res.status(400).json({ error: 'Moneda no soportada. Solo se permite ARS o USD.' });
    return;
  }

  if (typeof monto !== 'number' || monto <= 0) {
    res.status(400).json({ error: 'El monto debe ser un número mayor a cero.' });
    return;
  }

  try {
    // 2. Obtener la cuenta para verificar el saldo actual
    const cuenta = await dbQueryGet(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?',
      [usuarioId, moneda]
    );

    if (!cuenta) {
      res.status(404).json({ error: `No se encontró una billetera en ${moneda} para este usuario.` });
      return;
    }

    //  Validar fondos suficientes
    if (cuenta.saldo < monto) {
      res.status(400).json({ 
        error: 'Saldo insuficiente para realizar esta operación.',
        saldo_actual: cuenta.saldo,
        monto_solicitado: monto
      });
      return;
    }

    const nuevoSaldo = cuenta.saldo - monto;

    // 3. Iniciar transacción segura
    await dbRun('BEGIN TRANSACTION;');

    try {
      // 4. Actualizar restando el saldo en la tabla 'cuentas'
      await dbRun(
        'UPDATE cuentas SET saldo = ? WHERE usuario_id = ? AND moneda = ?',
        [nuevoSaldo, usuarioId, moneda]
      );

      await dbRun('COMMIT;');

    } catch (transactionError) {
      try {
        await dbRun('ROLLBACK;');
      } catch (rollbackErr) {
        console.error('⚠️ No se pudo ejecutar el ROLLBACK de retiro:', rollbackErr);
      }
      throw transactionError;
    }

    // 5. Respuesta única de éxito
    res.status(200).json({
      message: `Retiro de ${moneda} exitoso.`,
      moneda,
      monto_retirado: monto,
      nuevo_saldo: nuevoSaldo
    });

  } catch (error) {
    console.error('❌ Error al retirar fondos:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ocurrió un error interno al procesar el retiro.' });
    }
  }
};