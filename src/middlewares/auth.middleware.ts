import { type Request, type Response, type NextFunction } from 'express';
import { dbQueryGet } from '../db/connection.js';

export const requerirSesion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  // 1. Verificar si viene la cabecera Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token de sesión válido.' });
    return;
  }

  // Extraer el token puro (removiendo la palabra 'Bearer ')
  const tokenSesion = authHeader.split(' ')[1];

  try {
    // 2. Buscar el token en la tabla de sesiones de SQLite
    const sesion = await dbQueryGet(
      'SELECT usuario_id, fecha_expiracion FROM sesiones WHERE id = ?',
      [tokenSesion]
    );

    if (!sesion) {
      res.status(401).json({ error: 'Sesión inválida o inexistente. Inicie sesión nuevamente.' });
      return;
    }

    // 3. Validar si la sesión ya expiró matemáticamente
    const ahora = new Date();
    const expiracion = new Date(sesion.fecha_expiracion);

    if (ahora > expiracion) {
      res.status(401).json({ error: 'La sesión ha expirado. Inicie sesión nuevamente.' });
      return;
    }

    // 4. Si todo está en orden, inyectar el usuario_id en el objeto 'req'
    req.usuarioId = sesion.usuario_id;

    // 5. Cederle el paso al siguiente controlador o middleware
    next();

  } catch (error) {
    console.error('❌ Error en el middleware de autenticación:', error);
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
};