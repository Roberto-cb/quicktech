import { User } from "../interfaces/user.interfaces";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Solo usamos las propiedades necesarias del usuario
type UserJwtPayload = Pick<User, 'id' | 'email' | 'role'>;

export const generateToken = (user: UserJwtPayload): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};