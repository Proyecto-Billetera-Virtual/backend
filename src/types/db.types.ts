// Estructura de la tabla Usuarios
export interface Usuario {
  id?: number; // Opcional porque al insertar lo genera SQLite de forma autoincremental
  nombre: string;
  email: string;
  password_hash: string;
  verificado: boolean; // Almacenado como 0 o 1 en SQLite (pero mapeado como boolean en TS)
}

// Estructura de la tabla Cuentas
export interface Cuenta {
  id?: number;
  usuario_id: number; // Clave foránea hacia Usuarios
  moneda: 'ARS' | 'USD'; // Tipado estricto: no permite strings aleatorios
  saldo: number;
}

// Estructura de la tabla Sesiones (Nuestro reemplazo oficial a JWT)
export interface Sesion {
  id: string; // El token de sesión único (puede ser un UUID v4 o un string largo)
  usuario_id: number; // Clave foránea hacia Usuarios
  fecha_expiracion: string; // ISO String para manejar fechas en SQLite de forma segura
}