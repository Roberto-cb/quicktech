import { JwtPayload } from "../models/jwt.interface";
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    
    }
  }
}

export {};