import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Definimos un tipo extendido para Request con la propiedad user
type RequestWithUser = Request & {
  user?: {
    id: number;
    email: string;
    role: 'client' | 'admin';
  };
};

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeaders = req.headers['authorization'];
  const headerToken = authHeaders && authHeaders.split(' ')[1];
  const cookieToken = (req as any).cookies?.token;
  
  const token = headerToken || cookieToken;
  if (!token) {
    res.status(401).json({ error: 'No tiene acceso. Token no proporcionado.' });
    return;
  }

try{
  const decoded = jwt.verify(token, JWT_SECRET);
  (req as any).user = decoded;
  next();

}catch{
  res.status(403).json({error: 'Token invalido o expirado'})
}
};

// Middleware para verificar el rol del usuario (solo permite acceso si el rol coincide)
export const checkRole = (role: 'client' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as RequestWithUser;
    if (reqWithUser.user?.role !== role) {
      return res.status(403).json({ error: 'Acceso denegado. No tienes los permisos necesarios.' });
    }
    next();
  };
};


