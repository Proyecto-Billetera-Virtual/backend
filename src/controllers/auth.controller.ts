import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { dbRun, dbQueryGet, db } from '../db/connection.js';

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password } = req.body;

  // 1. Validaciones básicas de entrada
  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'Todos los campos (nombre, email, password) son obligatorios.' });
    return;
  }

  try {
    // 2. Verificar si el email ya existe
    const usuarioExistente = await dbQueryGet('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarioExistente) {
      res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
      return;
    }

    // 3. Hashear la contraseña de forma segura
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Iniciar Transacción en SQLite para asegurar la atomicidad (se crea todo o nada)
    await dbRun('BEGIN TRANSACTION;');

    try {
      // 5. Insertar el usuario (verificado = 0 por defecto)
      const resultadoUsuario = await dbRun(
        'INSERT INTO usuarios (nombre, email, password_hash, verificado) VALUES (?, ?, ?, 0)',
        [nombre, email, passwordHash]
      );
      
      const nuevoUsuarioId = resultadoUsuario.lastID;

      // 6. Regla de negocio: Crear automáticamente cuenta en ARS y cuenta en USD
      await dbRun('INSERT INTO cuentas (usuario_id, moneda, saldo) VALUES (?, "ARS", 0.0)', [nuevoUsuarioId]);
      await dbRun('INSERT INTO cuentas (usuario_id, moneda, saldo) VALUES (?, "USD", 0.0)', [nuevoUsuarioId]);

      // 7. Si todo salió bien, confirmar los cambios en el archivo físico
      await dbRun('COMMIT;');

      // 8. Respuesta según los requerimientos (avisa que falta validar por correo)
      res.status(201).json({
        message: 'Usuario registrado con éxito. Por favor, valide su correo electrónico para activar la cuenta.',
        usuarioId: nuevoUsuarioId
      });

    } catch (transactionError) {
      // Si algo falló creando las cuentas o el usuario, cancelamos todo para no dejar datos corruptos
      await dbRun('ROLLBACK;');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error en el registro de usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
  }
};