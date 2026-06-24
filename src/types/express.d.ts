import { type Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      usuarioId?: number; // Permite adjuntar el ID del usuario autenticado en la petición
    }
  }
}